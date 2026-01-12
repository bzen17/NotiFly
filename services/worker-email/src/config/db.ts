import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { REDIS_URL, MONGO_URI, PG_CONNECTION } from './env';

let redisClient: ReturnType<typeof createClient> | null = null;
let mongoClient: MongoClient | null = null;
let pgPool: Pool | null = null;

export async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
}

export async function getMongo() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient;
}

export function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({ connectionString: PG_CONNECTION });
  }
  return pgPool;
}

export async function closeRedis() {
  if (redisClient) await redisClient.disconnect();
}

export async function closeMongo() {
  if (mongoClient) await mongoClient.close();
}

export async function closePg() {
  if (pgPool) await pgPool.end();
}
