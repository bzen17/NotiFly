import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { REDIS_URL, MONGO_URI, PG_CONNECTION } from './env';

let redisClient: ReturnType<typeof createClient> | null = null;
let mongoClient: MongoClient | null = null;
let pgPool: Pool | null = null;

export async function getRedis() {
  if (!redisClient) {
    if (REDIS_URL.startsWith('http://') || REDIS_URL.startsWith('https://')) {
      throw new Error(
        'Invalid Redis protocol in REDIS_URL: http(s) URLs are not supported by node-redis.\n' +
          'If you are using Upstash, set UPSTASH_REDIS_URL to the Redis-compatible URL (rediss://...)\n' +
          'Or set USE_CLOUD=false to use a local Redis instance and configure REDIS_HOST/REDIS_PORT.',
      );
    }
    redisClient = createClient({ url: REDIS_URL });
    // Attach an error handler to avoid unhandled exceptions bubbling during
    // shutdown when the client is forcefully disconnected by the server.
    redisClient.on('error', (err: any) => {
      try {
        // Ignore DisconnectsClientError which happens when quitting/disconnecting
        const msg = err && (err.message || String(err));
        if (msg && msg.toLowerCase().includes('disconnects client')) {
          return;
        }
      } catch (e) {
        // swallow
      }
    });
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
  if (redisClient) {
    // Prefer graceful QUIT if available to avoid interrupting in-flight stream reads
    try {
      if (typeof (redisClient as any).quit === 'function') {
        await (redisClient as any).quit();
      } else {
        await redisClient.disconnect();
      }
    } catch (err) {
      // As a last resort, force disconnect
      try {
        await redisClient.disconnect();
      } catch (e) {
        // swallow - we're shutting down
      }
    }
  }
}

export async function closeMongo() {
  if (mongoClient) await mongoClient.close();
}

export async function closePg() {
  if (pgPool) await pgPool.end();
}
