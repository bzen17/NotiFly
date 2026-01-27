import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { REDIS_URL, MONGO_URI, PG_CONNECTION } from './env';

let redisClient: ReturnType<typeof createClient> | null = null;
let mongoClient: MongoClient | null = null;
let pgPool: Pool | null = null;

export async function connectToDatastores() {
  if (!redisClient) {
    // Validate protocol: node-redis expects redis:// or rediss:// URLs.
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
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  }
  return { redis: redisClient, mongo: mongoClient };
}

export function getRedis() {
  if (!redisClient) throw new Error('Redis not initialized');
  return redisClient;
}

export function getMongo() {
  if (!mongoClient) throw new Error('Mongo not initialized');
  return mongoClient;
}

export function getPgPool() {
  if (!pgPool) {
    // Lazy-load PG pool using PG_CONNECTION env; Pool constructor tolerates empty string but
    // it's expected the environment will supply a valid connection string when Postgres is used.
    pgPool = new Pool({ connectionString: PG_CONNECTION });
  }
  return pgPool;
}
