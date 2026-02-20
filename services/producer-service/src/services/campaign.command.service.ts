import crypto from 'crypto';
import { getRedis, getMongo } from '../config/db';
import { MONGO_DB } from '../config/env';
import { publishToStream } from './stream-producer.service';
import logger from '../utils/logger';
import notificationSchema from '../schemas/notification.schema';
import { STREAMS, STATUS } from '../constants';

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
  if (typeof redis.xadd === 'function') {
    const flat = Object.entries(fields).flat();
    return redis.xadd(stream, '*', ...flat);
  }
  throw new Error(
    'Redis client does not support XADD; please use node-redis or provide an adapter',
  );
}

export async function createCampaign(body: any): Promise<{ campaignId: string }> {
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

  const dbClient = await getMongo();
  let collection: any;
  if (typeof (dbClient as any).db === 'function') {
    collection = (dbClient as any).db(MONGO_DB).collection('campaigns');
  } else if (typeof (dbClient as any).collection === 'function') {
    collection = (dbClient as any).collection('campaigns');
  } else {
    throw new Error('Invalid DB returned from getMongo');
  }
  await collection.insertOne(event);

  const redis = await getRedis();
  await publishPointer(redis, STREAMS.INCOMING, { campaignId });
  logger.info(
    { stream: 'notifications.incoming', campaignId },
    'Published event pointer to stream',
  );

  try {
    await publishToStream(STREAMS.INCOMING, { campaignId });
  } catch (e) {
    logger.debug({ err: e }, 'publishToStream best-effort failed');
  }

  return { campaignId };
}

export default { createCampaign };
