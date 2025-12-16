import { createClient, RedisClientType } from 'redis';
import { REDIS_URL } from '../config';

let client: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
  if (client) return client;
  client = createClient({ url: REDIS_URL });
  client.on('error', (err) => console.warn('Redis client error', err));
  // start connecting in background; callers should handle readiness if needed
  client.connect().catch((err) => console.warn('Redis connect failed', err));
  return client;
}

export const redis = getRedisClient();

export async function ensureConsumerGroup(stream: string, group: string) {
  try {
    await redis.xGroupCreate(stream, group, '$', { MKSTREAM: true });
    console.log('Created consumer group', group, 'for', stream);
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('BUSYGROUP')) return;
    throw err;
  }
}
