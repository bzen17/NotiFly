import { redis, ensureConsumerGroup } from './clients/redis';
import { connectMongo } from './clients/mongo';
import { v4 as uuidv4 } from 'uuid';
import { renderTemplate } from './templates';
import {
  CONSUMER_GROUP,
  CONSUMER_NAME,
  INCOMING_STREAM,
  STREAM_EMAIL,
  STREAM_SMS,
  STREAM_PUSH,
  DEDUPE_TTL_SECONDS,
  POLL_BLOCK_MS,
} from './config';
import { EventPayload } from './types';

function parseFields(fields: string[]) {
  const out: any = {};
  for (let i = 0; i < fields.length; i += 2) {
    out[fields[i]] = fields[i + 1];
  }
  return out;
}

async function dedupeEvent(eventId: string) {
  const key = `dedupe:${eventId}`;
  const res = await redis.set(key, '1', { NX: true, EX: DEDUPE_TTL_SECONDS });
  return res === 'OK';
}

function resolveChannelsForRecipient(recipientEntry: any): string[] {
  // Determine which channels to use for a recipient entry.
  if (!recipientEntry) return [];
  if (typeof recipientEntry === 'string') {
    return recipientEntry.includes('@') ? ['email'] : ['push'];
  }

  if (Array.isArray(recipientEntry.channels)) return recipientEntry.channels;
  if (typeof recipientEntry.channels === 'string') return [recipientEntry.channels];
  if (recipientEntry.address && recipientEntry.address.includes('@')) return ['email'];
  return ['push'];
}

export async function runRouter() {
  const db = await connectMongo();
  await ensureConsumerGroup(INCOMING_STREAM, CONSUMER_GROUP);

  console.log('Router started, listening on', INCOMING_STREAM);

  while (true) {
    try {
      const res = await redis.xReadGroup(
        CONSUMER_GROUP,
        CONSUMER_NAME,
        { key: INCOMING_STREAM, id: '>' },
        { BLOCK: POLL_BLOCK_MS, COUNT: 10 },
      );

      if (!res) continue;

      for (const streamRes of res) {
        const messages = (streamRes as any).messages || [];
        for (const message of messages) {
          const id = message.id;
          const fields = message.message;
          const f = Array.isArray(fields) ? parseFields(fields as string[]) : (fields as any);
          // Parse event pointer and payload from the stream entry
          const explicitEventId = f.eventId || f.event_id;
          const raw = f.payload || f.data || f.event || '{}';
          let event: EventPayload;
          try {
            event = typeof raw === 'string' ? JSON.parse(raw) : raw;
          } catch (e) {
            event = { payload: raw } as any;
          }

          // Determine canonical event id
          const eventId = explicitEventId || event.eventId || id;
          console.log('Parsed incoming message', {
            redisId: id,
            explicitEventId,
            eventId,
            fields: f,
          });

          const allowed = await dedupeEvent(eventId);
          if (!allowed) {
            console.log('Duplicate event skipped', eventId);
            await redis.xAck(INCOMING_STREAM, CONSUMER_GROUP, id);
            continue;
          }

          // Load the full event document from MongoDB when available
          let dbEvent = event;
          if (eventId) {
            const coll = db.collection('events');
            const found = await coll.findOne({ _id: eventId });
            if (found) dbEvent = { ...(found as any), ...(event || {}) };
            console.log('Loaded event from mongo', { eventId, found: !!found });
          }
          // enrich with template
          if (dbEvent.templateId) {
            dbEvent.payload = await renderTemplate(db, dbEvent.templateId, dbEvent.payload || {});
          }
          // Expand recipients and fan-out to channel streams
          const recipients = dbEvent.recipients || [];
          if (!recipients || recipients.length === 0) {
            console.log('No recipients found for event, skipping fan-out', { eventId });
          }
          for (const r of recipients) {
            const channels = resolveChannelsForRecipient(r);
            for (const ch of channels) {
              const targetStream =
                ch === 'email' ? STREAM_EMAIL : ch === 'sms' ? STREAM_SMS : STREAM_PUSH;

              // publish message containing event pointer + recipient info + payload
              const msg = {
                eventId,
                recipient: r.address || r,
                tenantId: dbEvent.tenantId,
                channel: ch,
                payload: dbEvent.payload || {},
                meta: dbEvent.meta || {},
              };

              try {
                const msgStr = JSON.stringify(msg);
                await redis.xAdd(targetStream, '*', { body: msgStr });
                console.log('Routed to channel stream', {
                  eventId,
                  channel: ch,
                  recipient: r.address || r,
                  stream: targetStream,
                });
              } catch (err) {
                console.error('Failed to publish to channel stream', {
                  err,
                  targetStream,
                  eventId,
                  channel: ch,
                });
                // do not ack incoming so it can be retried
              }
            }
          }

          // ack incoming
          await redis.xAck(INCOMING_STREAM, CONSUMER_GROUP, id);
        }
      }
    } catch (err) {
      console.error('Router loop error', err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
