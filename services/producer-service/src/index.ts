import express from 'express';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

async function genUuid(): Promise<string> {
  // Prefer built-in `crypto.randomUUID` when available (Node 14.17+).
  // This avoids depending on ESM-only `uuid` when running under CommonJS dev tools.
  if (typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }

  // Dynamic import is supported in CommonJS and avoids `require()` of ESM modules.
  const mod = await import('uuid');
  // `uuid` v9+ exports `v4` as a named export; older packaging may differ.
  const v4 = (mod as any).v4 ?? (mod as any).default?.v4 ?? (mod as any).default;
  if (typeof v4 === 'function') return v4();

  throw new Error('Unable to generate uuid: no compatible generator found');
}

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

const redis = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
});

const mongo = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');
let eventsCol: any;

app.post('/v1/notifications/send', async (req, res) => {
  const payload = req.body;
  // minimal validation here — Copilot will flesh out
  const eventId = await genUuid();
  const event = { _id: eventId, ...payload, status: 'queued', createdAt: new Date() };
  await eventsCol.insertOne(event);
  // publish a lightweight pointer to Redis stream "notifications.incoming"
  await redis.xAdd('notifications.incoming', '*', { eventId });

  return res.status(202).json({ eventId, status: 'queued' });
});

async function startServer() {
  await redis.connect();
  await mongo.connect();
  eventsCol = mongo.db('notifly').collection('events');

  app.listen(PORT, () => {
    console.log(`Producer service listening on ${PORT}`);
  });
}

startServer().catch(console.error);
