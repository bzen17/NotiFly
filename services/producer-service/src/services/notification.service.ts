import crypto from 'crypto';
import { getRedis, getMongo } from '../config/db';
import { MONGO_DB } from '../config/env';
import { publishToStream } from './stream-producer.service';
import logger from '../utils/logger';
import notificationSchema from '../schemas/notification.schema';
async function genUuidFallback(): Promise<string> {
  if (typeof (crypto as any).randomUUID === 'function') return (crypto as any).randomUUID();
  const mod = await import('uuid');
  const v4 = (mod as any).v4 ?? (mod as any).default?.v4 ?? (mod as any).default;
  if (typeof v4 === 'function') return v4();
  throw new Error('Unable to generate uuid');
}

async function publishPointer(redis: any, stream: string, fields: Record<string, string>) {
  if (typeof redis.xAdd === 'function') {
    return redis.xAdd(stream, '*', fields);
  }
  if (typeof (redis as any).xadd === 'function') {
    const flat = Object.entries(fields).flat();
    return (redis as any).xadd(stream, '*', ...flat);
  }
  throw new Error(
    'Redis client does not support XADD; please use node-redis or provide an adapter',
  );
}

export async function sendNotification(body: any) {
  // Validate using shared Joi schema
  const { error } = notificationSchema.validate(body, { abortEarly: false });
  if (error) {
    const err = new Error('validation_error') as any;
    err.details = error.details;
    throw err;
  }

  const { tenantId, channel, recipients, payload, meta, scheduleAt } = body;

  const eventId = await genUuidFallback();
  const now = new Date();

  let scheduleDate: Date | null = null;
  if (scheduleAt != null) {
    const s = typeof scheduleAt === 'string' ? scheduleAt : String(scheduleAt);
    const d = new Date(s);
    scheduleDate = Number.isNaN(d.getTime()) ? null : d;
  }

  const event = {
    _id: eventId,
    tenantId,
    channel,
    recipients,
    payload,
    meta: meta || {},
    scheduleAt: scheduleDate,
    status: 'queued',
    createdAt: now,
  };

  // Persist event document in MongoDB
  const dbClient = await getMongo();
  let collection: any;
  if (typeof (dbClient as any).db === 'function') {
    // MongoClient
    collection = (dbClient as any).db(MONGO_DB).collection('events');
  } else if (typeof (dbClient as any).collection === 'function') {
    // Already a db-like object
    collection = (dbClient as any).collection('events');
  } else {
    throw new Error('Invalid DB returned from getMongo');
  }
  await collection.insertOne(event);

  // Publish pointer to notifications.incoming
  const redis = await getRedis();
  await publishPointer(redis, 'notifications.incoming', { eventId });
  logger.info({ stream: 'notifications.incoming', eventId }, 'Published event pointer to stream');

  // Optionally notify other producers/consumers via publishToStream helper
  try {
    await publishToStream('notifications.incoming', { eventId });
  } catch (e) {
    // best-effort: publishing via publishToStream is optional
    logger.debug({ err: e }, 'publishToStream best-effort failed');
  }

  return { eventId };
}

export default { sendNotification };
