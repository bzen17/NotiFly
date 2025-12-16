import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string' },
    channel: { type: 'string', enum: ['email', 'sms', 'push'] },
    recipients: { type: 'array', items: { type: 'string' }, minItems: 1 },
    payload: { type: 'object' },
    meta: { type: 'object' },
    scheduleAt: { type: 'string', format: 'date-time' },
  },
  required: ['tenantId', 'channel', 'recipients', 'payload'],
  additionalProperties: false,
};

const validate = ajv.compile(schema);

export interface Deps {
  db: any; // MongoDB database or collection; keep `any` here for flexibility in tests
  redis: any;
  genUuid: () => Promise<string>;
}

export async function sendNotification(body: any, deps: Deps) {
  const valid = validate(body);
  if (!valid) {
    const errors = validate.errors;
    const err = new Error('validation_error') as any;
    err.details = errors;
    throw err;
  }

  const { tenantId, channel, recipients, payload, meta, scheduleAt } = body;

  const eventId = await deps.genUuid();
  const now = new Date();

  // Coerce `scheduleAt` to a Date or null.
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
  const collection =
    typeof deps.db.collection === 'function' ? deps.db.collection('events') : deps.db;
  await collection.insertOne(event);
  // Publish an event pointer to `notifications.incoming` using XADD (Redis Streams).
  // This standardizes message semantics (persistence, stream ids, consumer groups).
  async function publishPointer(redis: any, stream: string, fields: Record<string, string>) {
    if (typeof redis.xAdd === 'function') {
      return redis.xAdd(stream, '*', fields);
    }
    if (typeof (redis as any).xadd === 'function') {
      // Some clients expose a lowercase `xadd` with different arg shape.
      const flat = Object.entries(fields).flat();
      return (redis as any).xadd(stream, '*', ...flat);
    }
    throw new Error(
      'Redis client does not support XADD; please use node-redis or provide an adapter',
    );
  }

  await publishPointer(deps.redis, 'notifications.incoming', { eventId });
  console.log('Published event to stream', { stream: 'notifications.incoming', eventId });

  return { eventId };
}
