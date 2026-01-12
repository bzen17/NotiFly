import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import { REDIS_URL, MONGO_URI } from './env';

let redisClient: ReturnType<typeof createClient> | null = null;
let mongoClient: MongoClient | null = null;

export async function connectToDatastores() {
  if (!redisClient) {
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
