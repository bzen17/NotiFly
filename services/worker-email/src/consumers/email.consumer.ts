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

  console.info('[EMAIL-CONSUMER] Listening for events...');

  while (running) {
    try {
      const res = (await redis.xReadGroup(group, consumer, [{ key: stream, id: '>' }], {
        BLOCK: 5000,
        COUNT: 10,
      })) as any;
      if (!res) continue;

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
    } catch (err) {
      log.error({ err }, 'error reading from stream');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export default runEmailConsumer;
