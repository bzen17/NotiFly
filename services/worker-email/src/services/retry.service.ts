import { MAX_RETRIES } from '../config/env';
import { log } from '../utils/logger';

export async function scheduleRetry(redis: any, campaign: any, attempt: number, mongo?: any) {
  // Exponential backoff: min(1 hour, 5 * 2^attempt) seconds
  const backoff = 5;
  const when = Date.now() + backoff * 1000;
  // Preserve recipient and tenantId when present so retry consumer can re-publish a full pointer
  const payload: any = { campaignId: campaign._id, attempt, when };
  if (campaign.recipient) payload.recipient = campaign.recipient;
  if (campaign.tenantId) payload.tenantId = campaign.tenantId;

  try {
    await redis.xAdd('notifications.retry', '*', { payload: JSON.stringify(payload) });
    log.info({ campaignId: campaign._id, attempt, when }, 'Enqueued retry message');

    if (mongo) {
      try {
        const db = typeof mongo.db === 'function' ? mongo.db() : mongo;
        const campaigns = db.collection('campaigns');
        await campaigns.updateOne(
          { _id: campaign._id },
          { $set: { status: 'scheduled', nextAttemptAt: new Date(when), attempt } },
        );
      } catch (err) {
        log.warn(
          { err, campaignId: campaign._id },
          'Failed to update campaign schedule metadata in Mongo',
        );
      }
    }

    return true;
  } catch (err) {
    log.error({ err, campaignId: campaign._id }, 'Failed to enqueue retry');
    return false;
  }
}

export function shouldRetry(attempt: number) {
  return attempt <= MAX_RETRIES;
}
