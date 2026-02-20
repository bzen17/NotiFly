import { getRedis, getMongo, getPgPool } from '../config/db';
import { publishToStream } from './stream-producer.service';
import logger from '../utils/logger';
import { STREAMS, STATUS, ERRORS } from '../constants';

const DLQ_STREAM = STREAMS.DLQ;

async function deleteDlqEntriesFor(
  redis: any,
  opts: { id?: string; campaignId?: string; recipient?: string },
): Promise<void> {
  try {
    if (opts.id) {
      if (typeof redis.xDel === 'function') {
        await redis.xDel(DLQ_STREAM, opts.id);
      } else if (typeof redis.xdel === 'function') {
        await redis.xdel(DLQ_STREAM, opts.id);
      }
      return;
    }

    const start = '-';
    const end = '+';
    let entries: any[] = [];
    if (typeof redis.xRange === 'function') {
      entries = await redis.xRange(DLQ_STREAM, start, end);
    } else if (typeof redis.xrange === 'function') {
      entries = await redis.xrange(DLQ_STREAM, start, end);
    }
    for (const e of entries) {
      const id = e.id || e[0];
      const msg = e.message || e[1] || {};
      const raw = msg.payload || msg.body || msg.data || msg.message || null;
      let payload: any = null;
      try {
        payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (err) {
        payload = raw;
      }
      const cid = payload?.campaignId || payload?.event_id || null;
      const rec = payload?.recipient || payload?.to || null;
      if (opts.campaignId && String(opts.campaignId) !== String(cid)) continue;
      if (opts.recipient && rec && String(opts.recipient) !== String(rec)) continue;
      try {
        if (typeof redis.xDel === 'function') {
          await redis.xDel(DLQ_STREAM, id);
        } else if (typeof redis.xdel === 'function') {
          await redis.xdel(DLQ_STREAM, id);
        }
        logger.info(
          { id, campaignId: cid, recipient: rec },
          'Deleted DLQ stream entry after requeue',
        );
      } catch (e) {
        logger.warn({ err: e, id }, 'Failed to delete DLQ entry');
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Failed scanning DLQ stream for deletions');
  }
}

export async function listDlq({ page = 1, limit = 50, filter = {} }: any): Promise<any> {
  const redis = getRedis();
  const start = '-';
  const end = '+';
  let entries: any[] = [];
  try {
    if (typeof (redis as any).xRange === 'function') {
      entries = await (redis as any).xRange(DLQ_STREAM, start, end, { COUNT: limit * page });
    } else if (typeof (redis as any).xrange === 'function') {
      entries = await (redis as any).xrange(DLQ_STREAM, start, end, 'COUNT', String(limit * page));
    } else {
      entries = [];
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to read DLQ stream');
    entries = [];
  }

  const parsed = entries.map((e: any) => {
    const id = e.id || e[0];
    const msg = e.message || e[1] || {};
    const raw = msg.payload || msg.body || msg.data || msg.message || null;
    let payload: any = null;
    try {
      payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      payload = raw;
    }

    let ts: number | null = null;
    try {
      const parts = String(id).split('-');
      ts = Number(parts[0]) || null;
    } catch (e) {
      ts = null;
    }
    return {
      id,
      payload,
      msg,
      ts,
    };
  });

  const campaignIds = Array.from(
    new Set(parsed.map((p: any) => p.payload?.campaignId || p.payload?.event_id).filter(Boolean)),
  );

  const campaignMeta: Record<string, any> = {};
  if (campaignIds.length > 0) {
    try {
      const mongo = await getMongo();
      const col = (mongo as any).db
        ? (mongo as any).db().collection('campaigns')
        : (mongo as any).collection('campaigns');
      const q = { _id: { $in: campaignIds } } as any;

      const docs = await col
        .find(q, {
          projection: { name: 1, tenantId: 1, tenant_id: 1, createdAt: 1, created_at: 1 },
        })
        .toArray();
      for (const d of docs) {
        campaignMeta[String(d._id)] = d;
      }
    } catch (err) {
      logger.warn({ err }, 'failed to load campaign metadata for DLQ');
    }
  }

  const filtered = parsed.filter((p: any) => {
    if (filter.campaignId) {
      const ev = p.payload?.campaignId || p.payload?.event_id || null;
      if (String(ev) !== String(filter.campaignId)) return false;
    }
    if (filter.channel) {
      const ch = p.payload?.channel || null;
      if (ch == null || String(ch) !== String(filter.channel)) return false;
    }
    if (filter.recipient) {
      const r = p.payload?.recipient || p.payload?.to || null;
      if (r == null || String(r) !== String(filter.recipient)) return false;
    }
    if (filter.errorContains) {
      const errField = p.payload?.error || p.msg?.error || '';
      if (!String(errField).toLowerCase().includes(String(filter.errorContains).toLowerCase()))
        return false;
    }
    if (filter.since) {
      if (!p.ts || Number(p.ts) < Number(filter.since)) return false;
    }
    if (filter.until) {
      if (!p.ts || Number(p.ts) > Number(filter.until)) return false;
    }

    if (filter.tenantId) {
      const tPayload = p.payload?.tenantId || p.payload?.tenant_id || null;
      if (tPayload) {
        if (String(tPayload) !== String(filter.tenantId)) return false;
      } else {
        const cid = p.payload?.campaignId || p.payload?.event_id;
        const meta = cid ? campaignMeta[String(cid)] : null;
        const tMeta = meta?.tenantId || meta?.tenant_id || null;
        if (tMeta) {
          if (String(tMeta) !== String(filter.tenantId)) return false;
        } else {
          return false;
        }
      }
    }

    return true;
  });

  const offset = (page - 1) * limit;
  const slice = filtered.slice(offset, offset + limit);
  const items = slice.map((p: any) => ({
    tenantId: p.payload?.tenantId || null,
    deliveryId: p.id,
    campaignId: p.payload?.campaignId || null,
    channel: p.payload?.channel || 'email',
    recipient: p.payload?.recipient,
    campaignName: campaignMeta[String(p.payload?.campaignId || p.payload?.event_id)]?.name || null,
    campaignCreatedAt: campaignMeta[String(p.payload?.campaignId)]?.createdAt || null,
    attempt: p.payload?.attempt != null ? Number(p.payload.attempt) : null,
    errorReason: p.payload?.error || (p.payload && p.payload.error) || p.msg?.error || null,
    failedAt: p.ts ? new Date(p.ts) : null,
  }));

  return { page, limit, items };
}

export async function requeueDlq(
  deliveryId: string,
  requestingUser?: { id?: string; role?: string; tenantId?: string },
): Promise<any> {
  const redis = getRedis();

  let entries: any[] = [];
  try {
    if (typeof (redis as any).xRange === 'function') {
      entries = await (redis as any).xRange(DLQ_STREAM, deliveryId, deliveryId);
    } else if (typeof (redis as any).xrange === 'function') {
      entries = await (redis as any).xrange(DLQ_STREAM, deliveryId, deliveryId);
    }
  } catch (err) {
    logger.warn({ err }, 'failed to read dlq entry');
    throw new Error(ERRORS.NOT_FOUND);
  }

  if (!entries || entries.length === 0) throw new Error(ERRORS.NOT_FOUND);
  const entry = entries[0];
  const id = entry.id || entry[0];
  const msg = entry.message || entry[1] || {};
  const raw = msg.payload || msg.body || msg.data || msg.message || null;
  let payload: any = null;
  try {
    payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    payload = raw;
  }

  const campaignId = payload?.campaignId || payload?.event_id;
  const recipient = payload?.recipient || payload?.to || null;
  const tenantId = payload?.tenantId || payload?.tenant_id || null;

  if (!campaignId || !recipient) throw new Error(ERRORS.NOT_FOUND);

  if (requestingUser && requestingUser.role === 'tenant') {
    const mongo = await getMongo();
    try {
      const col = (mongo as any).db
        ? (mongo as any).db().collection('campaigns')
        : (mongo as any).collection('campaigns');
      const ev = await col.findOne({ _id: campaignId });
      const owner = ev?.tenantId || ev?.tenant_id || null;
      const reqTenant = requestingUser.tenantId || requestingUser.id;
      if (!owner || String(owner) !== String(reqTenant)) {
        const e: any = new Error(ERRORS.FORBIDDEN);
        e.code = ERRORS.FORBIDDEN;
        throw e;
      }
    } catch (err) {
      const e: any = new Error(ERRORS.FORBIDDEN);
      e.code = ERRORS.FORBIDDEN;
      throw e;
    }
  }

  const mongo = await getMongo();
  let channel: string | null = null;
  try {
    const col = (mongo as any).db
      ? (mongo as any).db().collection('campaigns')
      : (mongo as any).collection('campaigns');
    const ev = await col.findOne({ _id: campaignId });
    if (ev && ev.channel) channel = ev.channel;
  } catch (err) {
    logger.warn({ err }, 'could not load event for requeue');
  }

  const REQUEUE_LOCK_MS = Number(process.env.REQUEUE_LOCK_MS || 10 * 60 * 1000);
  const pg = getPgPool();
  const res = await pg.query(
    'SELECT id, status, attempt_count, updated_at FROM deliveries WHERE campaign_id = $1 AND recipient = $2',
    [campaignId, recipient],
  );
  const existingRow = res.rows && res.rows[0];
  const updatedAt = existingRow.updated_at ? new Date(existingRow.updated_at).getTime() : 0;
  let lockedUntil = new Date(Date.now() + REQUEUE_LOCK_MS).toISOString();
  if (existingRow && existingRow.status === STATUS.REQUEUED) {
    if (Date.now() - updatedAt < REQUEUE_LOCK_MS) {
      lockedUntil = new Date(updatedAt + REQUEUE_LOCK_MS).toISOString();
      const e: any = new Error(ERRORS.LOCKED);
      e.code = ERRORS.LOCKED;
      e.requeueLockedUntil = lockedUntil;
      throw e;
    }
  }
  const attemptToSend = existingRow ? Number(existingRow.attempt_count || 0) : 0;

  let originalPayload: any = null;
  try {
    if (payload && payload.payload) {
      originalPayload =
        typeof payload.payload === 'string' ? JSON.parse(payload.payload) : payload.payload;
    }
  } catch (e) {
    originalPayload = null;
  }

  let campaignPayload: any = null;
  try {
    const col = (mongo as any).db
      ? (mongo as any).db().collection('campaigns')
      : (mongo as any).collection('campaigns');
    const ev = await col.findOne({ _id: campaignId });
    campaignPayload = ev?.payload || null;
  } catch (e) {
    campaignPayload = null;
  }

  const toPublish = originalPayload || campaignPayload || {};

  const incomingPayload = {
    campaignId,
    recipient,
    requeue: true,
    payload: toPublish,
    attempt: Number(attemptToSend) + 1,
  };
  logger.info(
    {
      stream: STREAMS.INCOMING,
      campaignId,
      recipient,
      payload: toPublish,
      attempt: attemptToSend,
    },
    'Publishing requeue pointer to incoming stream',
  );
  await publishToStream(STREAMS.INCOMING, incomingPayload);

  try {
    await pg.query(
      `UPDATE deliveries SET status = '${STATUS.REQUEUED}', updated_at = clock_timestamp()::timestamptz(6) WHERE campaign_id = $1 AND recipient = $2 AND status != '${STATUS.REQUEUED}'`,
      [campaignId, recipient],
    );
  } catch (err) {
    logger.warn({ err }, 'failed to update deliveries status on requeue');
  }

  try {
    const redisCli = getRedis();
    await deleteDlqEntriesFor(redisCli, { id, campaignId, recipient });
  } catch (e) {
    logger.warn({ err: e }, 'failed to clean up dlq entries after requeue');
  }

  return { requeueLockedUntil: new Date(Date.now() + REQUEUE_LOCK_MS).toISOString() };
}

export async function requeueDeliveryRow(
  deliveryRowId: string,
  requestingUser?: { id?: string; role?: string; tenantId?: string },
): Promise<any> {
  const pg = getPgPool();

  const res = await pg.query(
    'SELECT id, campaign_id, recipient, status, attempt_count, updated_at FROM deliveries WHERE id = $1',
    [deliveryRowId],
  );
  if (!res.rows || res.rows.length === 0) throw new Error(ERRORS.NOT_FOUND);
  const row = res.rows[0];
  const { campaign_id: campaignId, recipient, status } = row;
  if (!campaignId || !recipient) throw new Error(ERRORS.NOT_FOUND);

  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  const REQUEUE_LOCK_MS = Number(process.env.REQUEUE_LOCK_MS || 10 * 60 * 1000);
  let lockedUntil = new Date(Date.now() + REQUEUE_LOCK_MS).toISOString();
  if (status === STATUS.REQUEUED) {
    if (Date.now() - updatedAt < REQUEUE_LOCK_MS) {
      lockedUntil = new Date(updatedAt + REQUEUE_LOCK_MS).toISOString();
      const e: any = new Error(ERRORS.LOCKED);
      e.code = ERRORS.LOCKED;
      e.requeueLockedUntil = lockedUntil;
      throw e;
    }
  }

  const mongo = await getMongo();
  let channel: string | null = null;
  let ev: any = null;
  try {
    const col = (mongo as any).db
      ? (mongo as any).db().collection('campaigns')
      : (mongo as any).collection('campaigns');
    ev = await col.findOne({ _id: campaignId });
    if (ev && ev.channel) channel = ev.channel;
  } catch (err) {
    logger.warn({ err }, 'could not load event for requeue');
  }

  if (requestingUser && requestingUser.role === 'tenant') {
    const owner = ev?.tenantId || ev?.tenant_id || null;
    const reqTenant = requestingUser.tenantId || requestingUser.id;
    if (!owner || String(owner) !== String(reqTenant)) {
      const e: any = new Error(ERRORS.FORBIDDEN);
      e.code = ERRORS.FORBIDDEN;
      throw e;
    }
  }

  const stream = channel ? `notifications.${channel}` : 'notifications.incoming';
  const locks: Record<string, string> = {};

  const attemptForRow = Number(row.attempt_count || 0);
  const fullPayload = ev?.payload || {};

  const incomingPayload = {
    campaignId,
    recipient,
    requeue: true,
    payload: fullPayload,
    attempt: attemptForRow + 1,
  };
  logger.info(
    { campaignId, recipient, payload: fullPayload, attempt: attemptForRow },
    'Publishing requeue pointer to incoming stream for delivery row',
  );
  await publishToStream(STREAMS.INCOMING, incomingPayload);

  try {
    const redisCli = getRedis();
    await deleteDlqEntriesFor(redisCli, { campaignId, recipient });
  } catch (e) {
    logger.warn(
      { err: e, campaignId, recipient },
      'failed to clean up dlq entries after requeueDeliveryRow',
    );
  }
  try {
    await pg.query(
      `UPDATE deliveries SET status = '${STATUS.REQUEUED}', updated_at = clock_timestamp()::timestamptz(6) WHERE id = $1 AND status != '${STATUS.REQUEUED}'`,
      [deliveryRowId],
    );
  } catch (err) {
    logger.warn({ err }, 'failed to update delivery status on requeue');
  }
  return { requeueLockedUntil: lockedUntil };
}

export async function requeueCampaign(
  campaignId: string,
  requestingUser?: { id?: string; role?: string; tenantId?: string },
): Promise<any> {
  const pg = getPgPool();

  const res = await pg.query(
    `SELECT id, recipient, attempt_count FROM deliveries WHERE campaign_id = $1 AND status = '${STATUS.FAILED}'`,
    [campaignId],
  );
  if (!res.rows || res.rows.length === 0) return { requeued: 0 };
  let requeued = 0;

  const mongo = await getMongo();
  let channel: string | null = null;
  let ev: any = null;
  try {
    const col = (mongo as any).db
      ? (mongo as any).db().collection('campaigns')
      : (mongo as any).collection('campaigns');
    ev = await col.findOne({ _id: campaignId });
    if (ev && ev.channel) channel = ev.channel;
  } catch (err) {
    logger.warn({ err }, 'could not load event for campaign requeue');
  }

  if (requestingUser && requestingUser.role === 'tenant') {
    const owner = ev?.tenantId || ev?.tenant_id || null;
    const reqTenant = requestingUser.tenantId || requestingUser.id;
    if (!owner || String(owner) !== String(reqTenant)) {
      const e: any = new Error(ERRORS.FORBIDDEN);
      e.code = ERRORS.FORBIDDEN;
      throw e;
    }
  }

  const stream = channel ? `notifications.${channel}` : STREAMS.INCOMING;
  const REQUEUE_LOCK_MS = Number(process.env.REQUEUE_LOCK_MS || 10 * 60 * 1000);
  const locks: Record<string, string> = {};
  const campaignLockedUntilIso = new Date(Date.now() + REQUEUE_LOCK_MS).toISOString();

  for (const row of res.rows) {
    try {
      const recipient = row.recipient;
      const tenantId = ev?.tenantId || ev?.tenant_id || null;
      const fullPayload = ev?.payload || {};
      const attemptForRow = Number(row.attempt_count || 0);

      const incomingPayload = {
        campaignId,
        recipient,
        requeue: true,
        payload: fullPayload,
        attempt: attemptForRow + 1,
      };
      logger.info(
        { campaignId, recipient, payload: fullPayload, attempt: attemptForRow },
        'Publishing requeue pointer to incoming stream for campaign delivery',
      );
      await publishToStream(STREAMS.INCOMING, incomingPayload);

      try {
        const redisCli = getRedis();
        await deleteDlqEntriesFor(redisCli, { campaignId, recipient });
      } catch (e) {
        logger.warn(
          { err: e, campaignId, recipient },
          'failed to clean up dlq entries after requeueCampaign',
        );
      }
      await pg.query(
        `UPDATE deliveries SET status = '${STATUS.REQUEUED}', updated_at = clock_timestamp()::timestamptz(6) WHERE id = $1 AND status = '${STATUS.FAILED}'`,
        [row.id],
      );

      try {
        const lockedUntilIso = campaignLockedUntilIso;
        locks[String(row.id)] = lockedUntilIso;
      } catch (e) {
        logger.warn({ err: e, rowId: row.id }, 'Failed to set lock for requeued row');
      }
      requeued += 1;
    } catch (err) {
      logger.warn({ err, row }, 'failed to requeue delivery row');
    }
  }

  return { requeued, locks, lockedUntil: campaignLockedUntilIso };
}

export default { listDlq, requeueDlq, requeueDeliveryRow, requeueCampaign, deleteDlqEntriesFor };
