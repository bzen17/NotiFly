import crypto from 'crypto';
import { getRedis, getMongo } from '../config/db';
import { MONGO_DB } from '../config/env';
import { publishToStream } from './stream-producer.service';
import logger from '../utils/logger';
import notificationSchema from '../schemas/notification.schema';
import { STREAMS, STATUS } from '../constants';
/**
 * Generate a UUID, using native crypto.randomUUID when available,
 * falling back to the `uuid` package if necessary.
 */
async function genUuidFallback(): Promise<string> {
  if (typeof (crypto as any).randomUUID === 'function') return (crypto as any).randomUUID();
  const mod = await import('uuid');
  const v4 = (mod as any).v4 ?? (mod as any).default?.v4 ?? (mod as any).default;
  if (typeof v4 === 'function') return v4();
  throw new Error('Unable to generate uuid');
}

/**
 * Publish a lightweight pointer to a Redis stream. Supports both modern
 * node-redis (`xAdd`) and older clients exposing `xadd`.
 */
async function publishPointer(redis: any, stream: string, fields: Record<string, string>) {
  if (typeof redis.xAdd === 'function') {
    return redis.xAdd(stream, '*', fields);
  }
  if (typeof (redis as any).xadd === 'function') {
    const flat = Object.entries(fields).flat();
    return (redis as any).xadd(stream, '*', ...flat);
  }
  throw new Error('Redis client does not support XADD; please use node-redis or provide an adapter');
}

/**
 * Create a new campaign event and publish a pointer to the incoming stream.
 * - Validates the request using the shared `notificationSchema`.
 * - Persists an event document to MongoDB.
 * - Writes a pointer to the Redis `notifications.incoming` stream for downstream processing.
 *
 * @param body - incoming campaign payload
 * @returns object containing the generated `campaignId`
 */
export async function createCampaign(body: any): Promise<{ campaignId: string }> {
  // Validate using shared Joi schema
  const { error } = notificationSchema.validate(body, { abortEarly: false });
  if (error) {
    const err = new Error('validation_error') as any;
    err.details = error.details;
    throw err;
  }

  const { name, tenantId, channel, recipients, payload, meta, scheduleAt } = body;

  const campaignId = await genUuidFallback();
  const now = new Date();

  let scheduleDate: Date | null = null;
  if (scheduleAt != null) {
    const s = typeof scheduleAt === 'string' ? scheduleAt : String(scheduleAt);
    const d = new Date(s);
    scheduleDate = Number.isNaN(d.getTime()) ? null : d;
  }

  const event = {
    _id: campaignId,
    tenantId,
    channel,
    recipients,
    name,
    payload,
    meta: meta || {},
    scheduleAt: scheduleDate,
    status: STATUS.QUEUED,
    createdAt: now,
  };

  // Persist event document in MongoDB
  const dbClient = await getMongo();
  let collection: any;
  if (typeof (dbClient as any).db === 'function') {
    // MongoClient
    collection = (dbClient as any).db(MONGO_DB).collection('campaigns');
  } else if (typeof (dbClient as any).collection === 'function') {
    // Already a db-like object
    collection = (dbClient as any).collection('campaigns');
  } else {
    throw new Error('Invalid DB returned from getMongo');
  }
  await collection.insertOne(event);

  // Publish pointer to notifications.incoming
  const redis = await getRedis();
  await publishPointer(redis, STREAMS.INCOMING, { campaignId });
  logger.info(
    { stream: 'notifications.incoming', campaignId },
    'Published event pointer to stream',
  );

  // Optionally notify other producers/consumers via publishToStream helper
  try {
    await publishToStream(STREAMS.INCOMING, { campaignId });
  } catch (e) {
    // best-effort: publishing via publishToStream is optional
    logger.debug({ err: e }, 'publishToStream best-effort failed');
  }

  return { campaignId };
}

export default { createCampaign };
