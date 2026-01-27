import { Request, Response } from 'express';
import { getDashboardMetrics } from '../services/dashboard.service';
import { getPgPool } from '../config/db';
import { NODE_ENV, PG_CONNECTION } from '../config/env';
import logger from '../utils/logger';

export async function dashboardMetricsController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const range = (req.query.range as string) || '24h';
    const metrics = await getDashboardMetrics(user, range);
    // Optional debug diagnostics: if ?debug=1 include DB connection info and simple checks
    if ((req.query.debug as string) === '1' || NODE_ENV !== 'production') {
      try {
        const pg = getPgPool();
        const dbInfo: any = {};
        try {
          const dbRes = await pg.query('SELECT current_database() AS db, current_user AS user');
          dbInfo.db = dbRes.rows?.[0]?.db;
          dbInfo.user = dbRes.rows?.[0]?.user;
        } catch (e) {
          dbInfo.error = String(e);
        }
        try {
          const cnt = await pg.query('SELECT COUNT(*)::int AS cnt FROM deliveries');
          dbInfo.deliveries = Number(cnt.rows?.[0]?.cnt || 0);
        } catch (e) {
          dbInfo.deliveriesError = String(e);
        }
        try {
          const sample = await pg.query(
            `SELECT id, campaign_id, channel, status, attempt_count, created_at, updated_at
             FROM deliveries ORDER BY created_at DESC LIMIT 20`,
          );
          dbInfo.sample = sample.rows || [];
        } catch (e) {
          dbInfo.sampleError = String(e);
        }
        (metrics as any)._diagnostics = { pgConnectionString: PG_CONNECTION, dbInfo };
      } catch (e) {
        (metrics as any)._diagnostics = { error: String(e) };
      }
    }
    return res.json(metrics);
  } catch (err) {
    logger.error({ err }, 'dashboardMetricsController error');
    const msg = err && (err as any).message ? (err as any).message : 'failed_to_compute_metrics';
    const payload: any = { error: 'failed_to_compute_metrics' };
    if (NODE_ENV !== 'production') payload.details = msg;
    return res.status(500).json(payload);
  }
}

export default { dashboardMetricsController };
