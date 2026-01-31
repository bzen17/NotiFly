import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { MONGO_URI, REDIS_URL } from './env';

let mongoClient: MongoClient | null = null;
let redisClient: ReturnType<typeof createClient> | null = null;

export async function connectDatastores() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  }
  if (!redisClient) {
    if (REDIS_URL.startsWith('http://') || REDIS_URL.startsWith('https://')) {
      throw new Error(
        'Invalid Redis protocol in REDIS_URL: http(s) URLs are not supported by node-redis.\n' +
          'If you are using Upstash, set UPSTASH_REDIS_URL to the Redis-compatible URL (rediss://...)\n' +
          'Or set USE_CLOUD=false to use a local Redis instance and configure REDIS_HOST/REDIS_PORT.',
      );
    }
    redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();
  }
  return { mongo: mongoClient, redis: redisClient };
}

export function getMongo() {
  if (!mongoClient) throw new Error('Mongo not initialized; call connectDatastores first');
  return mongoClient;
}

export function getRedis() {
  if (!redisClient) throw new Error('Redis not initialized; call connectDatastores first');
  return redisClient;
}

export async function ensureConsumerGroup(stream: string, group: string) {
  const r = getRedis();
  try {
    await r.xGroupCreate(stream, group, '0', { MKSTREAM: true });
  } catch (e: any) {
    // node-redis throws an Error containing BUSYGROUP when group exists
    if (String(e).includes('BUSYGROUP')) return;
    throw e;
  }
}
