import { createClient, RedisClientType } from 'redis';
import { REDIS_URL } from '../config/env';
import logger from '../utils/logger';

let client: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
  if (client) return client;
  client = createClient({ url: REDIS_URL });
  client.on('error', (err) => logger.warn({ err }, 'Redis client error'));
  // start connecting in background; callers should handle readiness if needed
  client.connect().catch((err) => logger.warn({ err }, 'Redis connect failed'));
  return client;
}

export const redis = getRedisClient();

export async function ensureConsumerGroup(stream: string, group: string) {
  try {
    await redis.xGroupCreate(stream, group, '$', { MKSTREAM: true });
    logger.info({ group, stream }, 'Created consumer group');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('BUSYGROUP')) return;
    throw err;
  }
}
