import stableHash from '../utils/hash';
import { getEmailAdapter } from '../adapter';
import { log } from '../utils/logger';
import { DEDUPE_TTL, MAX_RETRIES } from '../config/env';
import { setDedupKey, isDuplicate } from './dedupe.service';
import { allowRate } from './rate-limit.service';
import { scheduleRetry, shouldRetry } from './retry.service';
import { writeDlq } from './dlq.service';
import { markDeliveryStatus } from './delivery-status.service';

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
    if (fields?.eventId) body.eventId = fields.eventId;
    if (fields?.event_id) body.eventId = body.eventId || fields.event_id;
    if (fields?.recipient) body.recipient = fields.recipient;
    if (fields?.to) body.recipient = body.recipient || fields.to;
    if (fields?.tenantId) body.tenantId = fields.tenantId;
    if (fields?.tenant_id) body.tenantId = body.tenantId || fields.tenant_id;
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

  const eventId = body.eventId;
  const recipient = body.recipient;
  const tenantId = body.tenantId;
  const payload = body.payload || {};
  const attempt = Number(body.attempt || 0);

  if (!eventId || !recipient) {
    log.warn({ id, body }, 'invalid message missing eventId/recipient');
    return;
  }

  log.info({ eventId, id, recipient }, 'Email worker received message');

  // Dedupe per event+recipient
  const dedupKey = `dedupe:${stableHash(eventId + '|' + recipient)}`;
  const notSet = await setDedupKey(redis, dedupKey, DEDUPE_TTL);
  if (!notSet) {
    log.info({ eventId, recipient }, 'duplicate delivery, skipping');
    return;
  }

  // Rate limiting per tenant
  const allowed = await allowRate(redis, tenantId || 'default');
  if (!allowed) {
    log.info({ tenant: tenantId }, 'rate limit exceeded, scheduling retry');
    await scheduleRetry(redis, { _id: eventId, tenantId }, attempt + 1);
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
      eventId,
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
      error: resp.success ? undefined : (resp as any).errorCode || 'FAILED',
    };
    const now = new Date();

    // Write delivery row to Postgres
    try {
      await pg.query(
        'INSERT INTO deliveries(event_id, tenant_id, recipient, status, code, created_at) VALUES($1,$2,$3,$4,$5,$6)',
        [
          eventId,
          tenantId || null,
          recipient,
          result.success ? 'delivered' : 'failed',
          result.code || null,
          now,
        ],
      );
    } catch (err) {
      log.warn({ err }, 'Failed to write to Postgres deliveries table');
    }

    if (!result.success) {
      const nextAttempt = attempt + 1;
      if (nextAttempt > MAX_RETRIES) {
        log.warn({ eventId, recipient }, 'Max retries exceeded; sending to DLQ');
        await writeDlq(redis, { eventId, recipient, error: result.error || 'failed' });
      } else {
        await scheduleRetry(redis, { _id: eventId, tenantId, recipient }, nextAttempt);
        log.info(
          { eventId, recipient, attempt: nextAttempt },
          'Scheduled retry for failed delivery',
        );
      }
    } else {
      // Update event status on success
      try {
        await markDeliveryStatus(mongo, eventId, 'delivered');
      } catch (err) {
        log.warn({ err }, 'Could not update event status in Mongo');
      }
      log.info({ eventId, recipient }, 'Delivery succeeded');
    }
  } catch (err: any) {
    log.error({ err, eventId, recipient }, 'error sending to recipient');
    const nextAttempt = attempt + 1;
    if (nextAttempt > MAX_RETRIES) {
      await writeDlq(redis, { eventId, recipient, error: String(err) });
      log.warn({ eventId, recipient }, 'Moved to DLQ after repeated failures');
    } else {
      await scheduleRetry(redis, { _id: eventId, tenantId, recipient }, nextAttempt);
    }
  }
}
