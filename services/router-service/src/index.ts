import { connectDatastores, getRedis, getMongo, ensureConsumerGroup } from './config/db';
import {
  CONSUMER_GROUP,
  CONSUMER_NAME,
  INCOMING_STREAM,
  STREAM_EMAIL,
  STREAM_SMS,
  STREAM_PUSH,
  DEDUPE_TTL_SECONDS,
  POLL_BLOCK_MS,
  MONGO_DB,
} from './config/env';
import logger from './utils/logger';
import { CampaignPayload } from './types';

function parseFields(fields: string[]) {
  const out: any = {};
  for (let i = 0; i < fields.length; i += 2) {
    out[fields[i]] = fields[i + 1];
  }
  return out;
}

async function dedupeCampaign(redis: any, campaignId: string) {
  const key = `dedupe:${campaignId}`;
  const res = await redis.set(key, '1', { NX: true, EX: DEDUPE_TTL_SECONDS });
  // node-redis returns 'OK' when key set, null when not set
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
  const { mongo: dbClient, redis } = await connectDatastores();
  await ensureConsumerGroup(INCOMING_STREAM, CONSUMER_GROUP);

  logger.info({ stream: INCOMING_STREAM }, 'Router started, listening');

  while (true) {
    try {
      const res = await redis.xReadGroup(
        CONSUMER_GROUP,
        CONSUMER_NAME,
        { key: INCOMING_STREAM, id: '>' },
        { BLOCK: POLL_BLOCK_MS, COUNT: 10 },
      );

      if (!res) continue;

      const streamResults = Array.isArray(res) ? res : [res];

      for (const streamRes of streamResults) {
        const messages = (streamRes as any).messages || [];
        for (const message of messages) {
          const id = message.id;
          const fields = message.message;
          const f = Array.isArray(fields) ? parseFields(fields as string[]) : fields;
          // Parse campaign pointer and payload from the stream entry
          const explicitcampaignId = f.campaignId;
          const raw = f.payload || f.data || '{}';
          let campaign: CampaignPayload;
          try {
            campaign = typeof raw === 'string' ? JSON.parse(raw) : raw;
          } catch (e) {
            campaign = { payload: raw } as any;
          }

          // Determine canonical campaign id
          const campaignId = explicitcampaignId || campaign.campaignId || id;
          logger.debug(
            { redisId: id, explicitcampaignId, campaignId, fields: f },
            'Parsed incoming message',
          );

          // If this is a targeted requeue for a single recipient, bypass the campaign-level dedupe
          const requeueFlag =
            f.requeue || (campaign && (campaign.requeue || campaign.requeue === true));
          const explicitRecipient = f.recipient || campaign?.recipient || campaign?.recipients;
          let allowed = true;
          if (!requeueFlag) {
            allowed = await dedupeCampaign(redis, campaignId);
          }
          if (!allowed) {
            logger.info({ campaignId }, 'Duplicate campaign skipped');
            await redis.xAck(INCOMING_STREAM, CONSUMER_GROUP, id);
            continue;
          }

          // Load the full campaign document from MongoDB when available
          let dbCampaign = campaign;
          if (campaignId) {
            const mongo = dbClient;
            const coll =
              typeof (mongo as any).db === 'function'
                ? (mongo as any).db(MONGO_DB).collection('campaigns')
                : (mongo as any).collection('campaigns');
            const found = await coll.findOne({ _id: campaignId });
            if (found) dbCampaign = { ...found, ...(campaign || {}) };
            logger.debug({ campaignId, found: !!found }, 'Loaded campaign from mongo');
          }
          // Expand recipients and fan-out to channel streams
          let recipients = dbCampaign.recipients || [];
          // If this incoming pointer is a requeue targeted at a single recipient, use that recipient only
          if (requeueFlag && explicitRecipient) {
            const r = Array.isArray(explicitRecipient) ? explicitRecipient[0] : explicitRecipient;
            recipients = [typeof r === 'object' && r.address ? r.address : r];
          }
          if (!recipients || recipients.length === 0) {
            logger.warn({ campaignId }, 'No recipients found for campaign, skipping fan-out');
          }
          for (const r of recipients) {
            const channels = resolveChannelsForRecipient(r);
            for (const ch of channels) {
              const targetStream =
                ch === 'email' ? STREAM_EMAIL : ch === 'sms' ? STREAM_SMS : STREAM_PUSH;

              // publish message containing campaign pointer + recipient info + payload
              const msg = {
                campaignId,
                recipient: r.address || r,
                tenantId: dbCampaign.tenantId,
                channel: ch,
                payload: dbCampaign.payload || {},
                meta: dbCampaign.meta || {},
              };

              try {
                const msgStr = JSON.stringify(msg);
                await redis.xAdd(targetStream, '*', { body: msgStr });
                logger.info(
                  { campaignId, channel: ch, recipient: r.address || r, stream: targetStream },
                  'Routed to channel stream',
                );
              } catch (err) {
                logger.error(
                  { err, targetStream, campaignId, channel: ch },
                  'Failed to publish to channel stream',
                );
                // do not ack incoming so it can be retried
              }
            }
          }

          // ack incoming
          await redis.xAck(INCOMING_STREAM, CONSUMER_GROUP, id);
        }
      }
    } catch (err) {
      logger.error({ err }, 'Router loop error');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function main() {
  try {
    await runRouter();
  } catch (err) {
    logger.error({ err }, 'Fatal error');
    process.exit(1);
  }
}

main();
