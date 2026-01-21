import { getMongo, getPgPool } from '../config/db';
import campaignRepository from '../repositories/campaign.repository';
import deliveryRepository from '../repositories/delivery.repository';
import { AGGREGATE_STATUS } from '../constants';

/**
 * List campaigns with basic delivery counts.
 * @param options - pagination and filter options
 */
export async function listCampaigns({ page = 1, limit = 20, filter = {} }: any) {
  const skip = (page - 1) * limit;
  const mongo = await getMongo();
  const items = await campaignRepository.list(mongo, { skip, limit, filter });

  // For each campaign, fetch counts from Postgres
  const pg = getPgPool();
  const ids = items.map((i: any) => i._id);
  const counts = await deliveryRepository.countsForDeliveries(pg, ids);

  const rows = items.map((it: any) => {
    const c = counts[it._id] || { total: 0, success: 0, failure: 0 };
    const status = computeStatus(c);
    return {
      campaignId: it._id,
      name: it.name,
      createdAt: it.createdAt,
      status,
      totalDeliveries: c.total,
      success: c.success,
      failed: c.failed,
    };
  });

  return { page, limit, items: rows };
}

function computeStatus(c: any) {
  if (c.total === 0) return AGGREGATE_STATUS.IN_PROGRESS;
  if (c.total === c.success) return AGGREGATE_STATUS.COMPLETED;
  if (c.success > 0 && c.failed > 0) return AGGREGATE_STATUS.PARTIAL;
  return AGGREGATE_STATUS.FAILED;
}

/**
 * Retrieve a single campaign with aggregated delivery metrics.
 */
export async function getCampaign(campaignId: string) {
  const mongo = await getMongo();
  const doc = await campaignRepository.findById(mongo, campaignId);
  if (!doc) return null;
  // Fetch delivery counts from Postgres
  const pg = getPgPool();
  const counts = await deliveryRepository.countsForDeliveries(pg, [campaignId]);
  const c = counts[campaignId] || { total: 0, success: 0, failure: 0 };
  const status = computeStatus(c);

  return {
    campaignId: doc._id,
    name: doc.name,
    channel: doc.channel,
    recipientsCount: Array.isArray(doc.recipients) ? doc.recipients.length : undefined,
    totalDeliveries: c.total,
    success: c.success,
    failed: c.failed,
    payload: doc.payload,
    status,
    createdAt: doc.createdAt,
    scheduleAt: doc.scheduleAt || null,
    meta: doc.meta || {},
  };
}

function summarizePayload(payload: any) {
  return { title: payload?.title || payload?.subject || null };
}

/**
 * List deliveries for a given campaign from Postgres and annotate with campaign channel and requeue lock.
 */
export async function listDeliveriesForCampaign(campaignId: string, { page = 1, limit = 20 }: any) {
  const pg = getPgPool();
  const offset = (page - 1) * limit;
  const rows = await deliveryRepository.listForDeliveries(pg, campaignId, { offset, limit });
  // Fetch campaign/event from Mongo to obtain channel (deliveries table may not store it)
  const mongo = await getMongo();
  const ev = await campaignRepository.findById(mongo, campaignId);
  const channel = ev?.channel || null;
  const REQUEUE_LOCK_MS = Number(process.env.REQUEUE_LOCK_MS || 10 * 60 * 1000);

  const mapped = rows.map((r: any) => {
    const updatedAtDate = r.updated_at
      ? new Date(r.updated_at)
      : r.created_at
        ? new Date(r.created_at)
        : null;
    const updatedAtIso = updatedAtDate ? updatedAtDate.toISOString() : null;
    const requeueLockedUntil = updatedAtDate
      ? new Date(updatedAtDate.getTime() + REQUEUE_LOCK_MS).toISOString()
      : null;
    return {
      deliveryId: r.id,
      recipient: r.recipient,
      channel,
      status: r.status,
      attemptCount: r.attempt_count,
      lastError: r.code || null,
      updatedAt: updatedAtIso,
      requeueLockedUntil,
    };
  });
  return { page, limit, items: mapped };
}

export default { listCampaigns, getCampaign, listDeliveriesForCampaign };
