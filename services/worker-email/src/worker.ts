import pino from 'pino';
import { getRedis, closeRedis } from './clients/redis';
import { getMongo, closeMongo } from './clients/mongo';
import { getPgPool, closePg } from './clients/postgres';
import { sendEmail } from './adapters/mockEmailAdapter';
import stableHash from './utils/hash';
import {
  LOG_LEVEL,
  RATE_LIMIT,
  RATE_WINDOW,
  DEDUPE_TTL,
  MAX_RETRIES,
  STREAM,
  GROUP,
  CONSUMER,
} from './config';

const log = pino({ level: LOG_LEVEL });

let running = true;

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);

async function shutDown() {
  if (!running) return;
  running = false;
  log.info('Shutting down, closing connections...');
  try {
    await closeRedis();
    await closeMongo();
    await closePg();
  } catch (err) {
    log.warn('Error during shutdown', err);
  }
  process.exit(0);
}

// Token-bucket implemented in Redis using INCR + EXPIRE per tenant
async function allowRate(
  redis: any,
  tenantId: string,
  limit = 5,
  windowSeconds = 1,
): Promise<boolean> {
  const key = `rate:${tenantId}`;
  const v = await redis.incr(key);
  if (v === 1) {
    await redis.expire(key, windowSeconds);
  }
  return v <= limit;
}

// Dedup check using a short-lived Redis key
async function isDuplicate(redis: any, eventId: string): Promise<boolean> {
  const key = `dedupe:${eventId}`;
  const res = await redis.set(key, '1', { NX: true, EX: 60 });
  return res === null;
}

// Schedule a retry with exponential backoff
async function scheduleRetry(redis: any, event: any, attempt: number) {
  const backoff = Math.min(60 * 60, Math.pow(2, attempt) * 5); // seconds
  const payload = { eventId: event._id, attempt, when: Date.now() + backoff * 1000 };
  await redis.xAdd('notifications.retry', '*', { payload: JSON.stringify(payload) });
}

async function processMessage(redis: any, mongo: any, pg: any, msg: any) {
  // Message may contain a `body` JSON string or flat fields (eventId, recipient, payload)
  const [id, fields] = msg;
  // fields may be an object with a `body` stringified JSON, or flat keys like eventId/recipient/payload
  const bodyRaw = fields?.body ?? fields?.payload ?? fields?.data ?? null;
  let body: any = null;

  if (bodyRaw) {
    try {
      body = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
    } catch (e) {
      log.warn({ id, bodyRaw }, 'invalid message body JSON, skipping');
      return;
    }
  } else {
    // Construct body from flat fields when `body` is not present
    body = {};
    if (fields?.eventId) body.eventId = fields.eventId;
    if (fields?.event_id) body.eventId = body.eventId || fields.event_id;
    if (fields?.recipient) body.recipient = fields.recipient;
    if (fields?.to) body.recipient = body.recipient || fields.to;
    if (fields?.tenantId) body.tenantId = fields.tenantId;
    if (fields?.tenant_id) body.tenantId = body.tenantId || fields.tenant_id;
    if (fields?.payload) {
      try {
        body.payload =
          typeof fields.payload === 'string' ? JSON.parse(fields.payload) : fields.payload;
      } catch (e) {
        body.payload = fields.payload;
      }
    }
    if (fields?.attempt) body.attempt = fields.attempt;
  }

  if (!body) {
    log.warn({ id, fields }, 'empty/invalid message body, skipping');
    return;
  }

  const eventId = body.eventId;
  const recipient = body.recipient;
  const tenantId = body.tenantId;
  const payload = body.payload || {};
  const attempt = Number(body.attempt || 0);

  if (!eventId || !recipient) {
    log.warn({ id, body }, 'invalid message missing eventId/recipient');
    return;
  }

  log.info({ eventId, id, recipient }, 'Email worker received message');

  // Dedupe per event+recipient
  const dedupKey = `dedupe:${stableHash(eventId + '|' + recipient)}`;
  const setRes = await redis.set(dedupKey, '1', { NX: true, EX: DEDUPE_TTL }); // dedupe window
  if (setRes === null) {
    log.info({ eventId, recipient }, 'duplicate delivery, skipping');
    return;
  }

  // Rate limiting per tenant
  const allowed = await allowRate(redis, tenantId || 'default', RATE_LIMIT, RATE_WINDOW);
  if (!allowed) {
    log.info({ tenant: tenantId }, 'rate limit exceeded, scheduling retry');
    await scheduleRetry(redis, { _id: eventId, tenantId }, attempt + 1);
    return;
  }

  try {
    const result = await sendEmail(recipient, payload);
    const now = new Date();

    // Write delivery row to Postgres
    try {
      await pg.query(
        'INSERT INTO deliveries(event_id, tenant_id, recipient, status, code, created_at) VALUES($1,$2,$3,$4,$5,$6)',
        [
          eventId,
          tenantId || null,
          recipient,
          result.success ? 'delivered' : 'failed',
          result.code || null,
          now,
        ],
      );
    } catch (err) {
      log.warn({ err }, 'Failed to write to Postgres deliveries table');
    }

    if (!result.success) {
      const nextAttempt = attempt + 1;
      if (nextAttempt > MAX_RETRIES) {
        log.warn({ eventId, recipient }, 'Max retries exceeded; sending to DLQ');
        await redis.xAdd('notifications.dlq', '*', {
          payload: JSON.stringify({ eventId, recipient, error: result.error || 'failed' }),
        });
      } else {
        await scheduleRetry(redis, { _id: eventId, tenantId, recipient }, nextAttempt);
        log.info(
          { eventId, recipient, attempt: nextAttempt },
          'Scheduled retry for failed delivery',
        );
      }
    } else {
      // Update event status on success
      try {
        const events = mongo.collection('events');
        await events.updateOne(
          { _id: eventId },
          { $set: { lastDeliveredAt: new Date(), status: 'delivered' } },
        );
      } catch (err) {
        log.warn({ err }, 'Could not update event status in Mongo');
      }
      log.info({ eventId, recipient }, 'Delivery succeeded');
    }
  } catch (err: any) {
    log.error({ err, eventId, recipient }, 'error sending to recipient');
    const nextAttempt = attempt + 1;
    if (nextAttempt > MAX_RETRIES) {
      await redis.xAdd('notifications.dlq', '*', {
        payload: JSON.stringify({ eventId, recipient, error: String(err) }),
      });
      log.warn({ eventId, recipient }, 'Moved to DLQ after repeated failures');
    } else {
      await scheduleRetry(redis, { _id: eventId, tenantId, recipient }, nextAttempt);
    }
  }
}

async function runConsumer() {
  const redis = await getRedis();
  const mongo = await getMongo();
  const pg = getPgPool();

  // Ensure deliveries table exists - best effort
  try {
    await pg.query(`CREATE TABLE IF NOT EXISTS deliveries (
      id serial PRIMARY KEY,
      event_id text,
      tenant_id text,
      recipient text,
      status text,
      code text,
      created_at timestamptz
    )`);
  } catch (err) {
    log.warn({ err }, 'could not ensure deliveries table');
  }

  // Blocking consumer loop using XREADGROUP (node-redis v4)
  const stream = STREAM;
  const group = GROUP;
  const consumer = CONSUMER;

  // Create consumer group idempotently (ignore BUSYGROUP)
  try {
    await redis.xGroupCreate(stream, group, '0', { MKSTREAM: true });
  } catch (e: any) {
    if (!String(e).includes('BUSYGROUP')) {
      log.warn({ err: e }, 'xGroupCreate failed');
    }
  }

  console.info('[EMAIL-WORKER] Listening for events...');

  while (running) {
    try {
      const res = await redis.xReadGroup(group, consumer, [{ key: stream, id: '>' }], {
        BLOCK: 5000,
        COUNT: 10,
      });
      if (!res) continue;

      for (const s of res) {
        for (const message of s.messages) {
          const id = message.id;
          const msg = message.message; // object of fields
          try {
            await processMessage(redis, mongo, pg, [id, msg]);
            await redis.xAck(stream, group, id);
          } catch (err) {
            log.error({ err }, 'processing message failed');
            // write to DLQ
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
    } catch (err) {
      log.error({ err }, 'error reading from stream');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

runConsumer().catch((err) => {
  log.error({ err }, 'consumer crashed');
  process.exit(1);
});
