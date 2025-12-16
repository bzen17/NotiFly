import { createClient, RedisClientType } from 'redis';
import { REDIS_URL } from '../config';

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (client) return client;
  client = createClient({ url: REDIS_URL });
  client.on('error', (err) => console.warn('Redis client error', err));
  await client.connect();
  return client;
}

export async function closeRedis() {
  if (client) await client.quit();
}
