import { STATUS } from '../constants';

export async function listForDeliveries(pg: any, eventId: string, { offset = 0, limit = 20 }: any) {
  // Select stable columns only to remain compatible with older deployments
  const q = `SELECT id, campaign_id, recipient, status, code, attempt_count, created_at, updated_at FROM deliveries WHERE campaign_id = $1 ORDER BY created_at DESC OFFSET $2 LIMIT $3`;
  const res = await pg.query(q, [eventId, offset, limit]);
  return res.rows;
}

export async function countsForDeliveries(pg: any, eventIds: string[]) {
  if (!eventIds || eventIds.length === 0) return {};
  const delivered = STATUS.DELIVERED;
  const q = `SELECT campaign_id, COUNT(*) as total, SUM(CASE WHEN status = '${delivered}' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status != '${delivered}' THEN 1 ELSE 0 END) as failed FROM deliveries WHERE campaign_id = ANY($1) GROUP BY campaign_id`;
  const res = await pg.query(q, [eventIds]);
  const out: Record<string, any> = {};
  for (const r of res.rows) {
    out[r.campaign_id] = {
      total: Number(r.total),
      success: Number(r.success),
      failed: Number(r.failed),
    };
  }
  return out;
}

export default { listForDeliveries, countsForDeliveries };
