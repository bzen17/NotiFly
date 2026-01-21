import stableHash from '../utils/hash';
import { getEmailAdapter } from '../adapter';
import { log } from '../utils/logger';
import { DEDUPE_TTL, MAX_RETRIES } from '../config/env';
import { setDedupKey, isDuplicate } from './dedupe.service';
import { allowRate } from './rate-limit.service';
import { scheduleRetry, shouldRetry } from './retry.service';
import { writeDlq } from './dlq.service';
import { markDeliveryStatus } from './delivery-status.service';
import { STATUS } from '../constants';

export async function processMessage(redis: any, mongo: any, pg: any, msg: any) {
  const [id, fields] = msg;
  const bodyRaw = fields?.body ?? fields?.payload ?? fields?.data ?? null;
  let body: any = null;

  if (bodyRaw) {
    try {
      body = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
    } catch (e) {
      log.warn({ id, bodyRaw }, 'invalid message body JSON, skipping');
      return;
    }
  } else {
    body = {};
    if (fields?.campaignId) body.campaignId = fields.campaignId;
    if (fields?.recipient) body.recipient = fields.recipient;
    if (fields?.to) body.recipient = body.recipient || fields.to;
    if (fields?.tenantId) body.tenantId = fields.tenantId;
    if (fields?.payload) {
      try {
        body.payload =
          typeof fields.payload === 'string' ? JSON.parse(fields.payload) : fields.payload;
      } catch (e) {
        body.payload = fields.payload;
      }
    }
    if (fields?.attempt) body.attempt = fields.attempt;
  }

  if (!body) {
    log.warn({ id, fields }, 'empty/invalid message body, skipping');
    return;
  }

  const campaignId = body.campaignId;
  const recipient = body.recipient;
  const tenantId = body.tenantId;
  const payload = body.payload || {};
  const attempt = Number(body.attempt || 0);

  if (!campaignId || !recipient) {
    log.warn({ id, body }, 'invalid message missing campaignId/recipient');
    return;
  }

  log.info({ campaignId, id, recipient }, 'Email worker received message');

  // Dedupe per campaign+recipient+attempt to avoid skipping scheduled retries
  // (previously dedupe ignored attempt which caused retries to be skipped while the original
  // dedupe key was still valid). Including attempt keeps dedupe semantics for concurrent
  // duplicates while allowing separate retry attempts.
  const dedupKey = `dedupe:${stableHash(campaignId + '|' + recipient + '|' + String(attempt))}`;
  const notSet = await setDedupKey(redis, dedupKey, DEDUPE_TTL);
  if (!notSet) {
    log.info({ campaignId, recipient }, 'duplicate delivery, skipping');
    return;
  }

  // Rate limiting per tenant
  const allowed = await allowRate(redis, tenantId || 'default');
  if (!allowed) {
    log.info({ tenant: tenantId }, 'rate limit exceeded, scheduling retry');
    await scheduleRetry(redis, { _id: campaignId, tenantId }, attempt + 1, mongo);
    return;
  }

  try {
    const emailPayload = {
      channel: 'email',
      to: recipient,
      subject: payload?.subject || payload?.title || '',
      body: payload?.body || payload?.html || '',
      from: payload?.from || payload?.fromAddress || undefined,
      metadata: payload?.metadata || payload?.meta || payload || {},
      campaignId,
      tenantId,
    };

    const preferred = emailPayload?.metadata?.provider || process.env.EMAIL_PROVIDER;
    const adapter = getEmailAdapter(preferred);
    const resp = await adapter.send({
      to: emailPayload.to,
      subject: emailPayload.subject,
      text: emailPayload.body,
      html: emailPayload.body,
      from: emailPayload.from,
    });

    const result = {
      success: resp.success,
      code: (resp as any).errorCode || undefined,
      providerResponse: (resp as any).rawResponse,
      error: resp.success ? undefined : (resp as any).errorCode || STATUS.FAILED,
    };
    
    // Write delivery row to Postgres. Use upsert so retries update existing row
    try {
      await pg.query(
        `INSERT INTO deliveries(campaign_id, tenant_id, recipient, channel, status, code, created_at, updated_at, attempt_count)
         VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()::timestamptz(6),clock_timestamp()::timestamptz(6),1)
         ON CONFLICT (campaign_id, recipient) DO UPDATE SET
           channel = EXCLUDED.channel,
           status = EXCLUDED.status,
           code = EXCLUDED.code,
           updated_at = clock_timestamp()::timestamptz(6),
           attempt_count = COALESCE(deliveries.attempt_count, 0) + 1`,
        [
          campaignId,
          tenantId || null,
          recipient,
          'email',
          result.success ? STATUS.DELIVERED : STATUS.FAILED,
          result.code || null,
        ],
      );
    } catch (err) {
      log.warn({ err }, 'Failed to write to Postgres deliveries table');
    }

    if (!result.success) {
      const nextAttempt = attempt + 1;
      if (nextAttempt > MAX_RETRIES) {
        log.warn({ campaignId, recipient }, 'Max retries exceeded; sending to DLQ');
        await writeDlq(redis, {
          campaignId,
          recipient,
          error: result.error || STATUS.FAILED,
          payload,
          tenantId,
          attempt,
        });
      } else {
        await scheduleRetry(redis, { _id: campaignId, tenantId, recipient }, nextAttempt, mongo);
        log.info(
          { campaignId, recipient, attempt: nextAttempt },
          'Scheduled retry for failed delivery',
        );
      }
    } else {
      // Update campaign status on success
        try {
          await markDeliveryStatus(mongo, campaignId, STATUS.DELIVERED);
        } catch (err) {
          log.warn({ err }, 'Could not update campaign status in Mongo');
        }
      log.info({ campaignId, recipient }, 'Delivery succeeded');
    }
  } catch (err: any) {
    log.error({ err, campaignId, recipient }, 'error sending to recipient');
    const nextAttempt = attempt + 1;
    if (nextAttempt > MAX_RETRIES) {
      await writeDlq(redis, {
        campaignId,
        recipient,
        error: String(err),
        payload,
        tenantId,
        attempt,
      });
      log.warn({ campaignId, recipient }, 'Moved to DLQ after repeated failures');
    } else {
      await scheduleRetry(redis, { _id: campaignId, tenantId, recipient }, nextAttempt, mongo);
    }
  }
}
