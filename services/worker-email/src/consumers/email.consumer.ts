import { getRedis, getMongo, getPgPool } from '../config/db';
import { STREAM, GROUP, CONSUMER } from '../config/env';
import { log } from '../utils/logger';
import { processMessage } from '../services/consumer.service';

let running = true;

export function stopConsumer() {
  running = false;
}

export async function runEmailConsumer() {
  const redis = await getRedis();
  const mongo = await getMongo();
  const pg = getPgPool();

  // Ensure deliveries table exists - best effort
  try {
    await pg.query(`CREATE TABLE IF NOT EXISTS deliveries (
        id serial PRIMARY KEY,
        campaign_id text,
        tenant_id text,
        recipient text,
        status text,
        code text,
        created_at timestamptz(6) DEFAULT clock_timestamp()::timestamptz(6),
        updated_at timestamptz(6) DEFAULT clock_timestamp()::timestamptz(6),
        attempt_count integer DEFAULT 0
      )`);
    try {
      await pg.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS deliveries_campaign_recipient_uq ON deliveries(campaign_id, recipient)',
      );
    } catch (e) {
      // best-effort: index creation may fail under some permissions; warn and continue
      log.warn({ err: e }, 'could not create unique index on deliveries(campaign_id, recipient)');
    }
  } catch (err) {
    log.warn({ err }, 'could not ensure deliveries table');
  }

  const stream = STREAM;
  const group = GROUP;
  const consumer = CONSUMER;

  try {
    await redis.xGroupCreate(stream, group, '0', { MKSTREAM: true });
  } catch (e: any) {
    if (!String(e).includes('BUSYGROUP')) {
      log.warn({ err: e }, 'xGroupCreate failed');
    }
  }

  log.info('[EMAIL-CONSUMER] Listening for events...');

  while (running) {
    try {
      const res = (await redis.xReadGroup(group, consumer, [{ key: stream, id: '>' }], {
        BLOCK: 5000,
        COUNT: 10,
      })) as any;
      if (!res) {
        // No messages on main stream; still check scheduled retries so retry processing
        // doesn't depend on incoming traffic.
        try {
          await checkAndProcessRetries(redis, mongo, pg);
        } catch (err) {
          log.warn({ err }, 'checkAndProcessRetries failed');
        }
        continue;
      }

      for (const s of res) {
        for (const message of s.messages) {
          const id = message.id;
          const msg = message.message;
          try {
            await processMessage(redis, mongo, pg, [id, msg]);
            await redis.xAck(stream, group, id);
          } catch (err) {
            log.error({ err }, 'processing message failed');
            try {
              await redis.xAdd('notifications.dlq', '*', {
                payload: JSON.stringify({ id, error: String(err) }),
              });
            } catch (e) {
              log.warn({ err: e }, 'failed to write to dlq');
            }
            await redis.xAck(stream, group, id);
          }
        }
      }
      // After processing batch from main stream, also check scheduled retries
      try {
        await checkAndProcessRetries(redis, mongo, pg);
      } catch (err) {
        log.warn({ err }, 'checkAndProcessRetries failed');
      }
    } catch (err) {
      log.error({ err }, 'error reading from stream');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function checkAndProcessRetries(redis: any, mongo: any, pg: any) {
  // Read a small batch of retry entries and process those that are due
  let entries: any[] = [];
  try {
    if (typeof (redis as any).xRange === 'function') {
      entries = await (redis as any).xRange('notifications.retry', '-', '+', { COUNT: 50 });
    } else if (typeof (redis as any).xrange === 'function') {
      entries = await (redis as any).xrange('notifications.retry', '-', '+', 'COUNT', '50');
    }
  } catch (err) {
    log.warn({ err }, 'failed to read retry stream');
    return;
  }

  if (!entries || entries.length === 0) return;

  for (const e of entries) {
    const id = e.id || e[0];
    const msg = e.message || e[1] || {};
    const raw = msg.payload || msg.body || msg.data || null;
    let payload: any = null;
    try {
      payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      payload = raw;
    }

    if (!payload || !payload.when || !payload.campaignId) {
      // malformed -> delete
      try {
        if (typeof (redis as any).xDel === 'function')
          await (redis as any).xDel('notifications.retry', id);
      } catch (err) {
        log.warn({ err, id }, 'failed to delete malformed retry entry');
      }
      continue;
    }

    if (Number(payload.when) > Date.now()) continue; // not due yet

    // Build a message compatible with processMessage
    const body = {
      campaignId: payload.campaignId,
      recipient: payload.recipient,
      tenantId: payload.tenantId,
      attempt: payload.attempt,
      payload: payload.payload || undefined,
    };

    try {
      await processMessage(redis, mongo, pg, [id, { body: JSON.stringify(body) }]);
      // remove entry after processing
      try {
        if (typeof (redis as any).xDel === 'function')
          await (redis as any).xDel('notifications.retry', id);
      } catch (err) {
        log.warn({ err, id }, 'failed to delete processed retry entry');
      }
    } catch (err) {
      log.warn({ err, id }, 'processing retry entry failed');
      // leave entry for reprocessing or DLQ handling by existing logic
    }
  }
}

export default runEmailConsumer;
