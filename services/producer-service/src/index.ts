import express from 'express';

import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

async function genUuid(): Promise<string> {
  // Use `crypto.randomUUID` when available, otherwise dynamically import `uuid` as a fallback.
  if (typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }

  const mod = await import('uuid');
  const v4 = (mod as any).v4 ?? (mod as any).default?.v4 ?? (mod as any).default;
  if (typeof v4 === 'function') return v4();

  throw new Error('Unable to generate uuid: no compatible generator found');
}

import { REDIS_URL, MONGO_URI, MONGO_DB, PORT as CFG_PORT } from './config';

const app = express();
app.use(express.json());
const PORT = Number(CFG_PORT || process.env.PORT || 3001);

const redis = createClient({ url: REDIS_URL });

const mongo = new MongoClient(MONGO_URI);
let eventsCol: any;

import { sendNotification } from './handlers/sendNotification';

app.post('/v1/notifications/send', async (req, res) => {
  try {
    const result = await sendNotification(req.body, { db: mongo.db(MONGO_DB), redis, genUuid });
    return res.status(202).json({ eventId: result.eventId });
  } catch (err: any) {
    if (err && err.message === 'validation_error') {
      console.warn('Validation failed for incoming notification', err.details);
      return res.status(400).json({ error: 'validation_error', details: err.details });
    }
    console.error('Unhandled error in /v1/notifications/send', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

async function startServer() {
  await redis.connect();
  await mongo.connect();
  eventsCol = mongo.db(MONGO_DB).collection('events');

  app.listen(PORT, () => {
    console.log(`Producer service listening on ${PORT}`);
  });
}

startServer().catch(console.error);
