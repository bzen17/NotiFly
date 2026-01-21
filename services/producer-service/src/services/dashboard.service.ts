import { getPgPool, getRedis, getMongo } from '../config/db';
import { STREAMS, STATUS } from '../constants';

export async function getDashboardMetrics(user: any, range: string = '24h') {
  let pg: any = null;
  let redis: any = null;
  let mongo: any = null;

  try {
    pg = getPgPool();
  } catch (e) {
    pg = null;
  }
  try {
    redis = getRedis();
  } catch (e) {
    redis = null;
  }
  try {
    mongo = await getMongo();
  } catch (e) {
    mongo = null;
  }

  // Tenant scoping: admin sees all, tenant sees only their tenantId
  const tenantClause = user && user.role !== 'admin' && user.tenantId ? `WHERE tenant_id = $1` : '';
  const tenantParams = user && user.role !== 'admin' && user.tenantId ? [user.tenantId] : [];

  // Basic counts from Postgres deliveries table
  let totalDeliveries = 0;
  let successCount = 0;
  let failedCount = 0;
  let last24 = 0;
  let today = 0;
  let perChannel: Array<any> = [];
  let timeSeries: any = { buckets: [], channels: {} };

  if (pg) {
    try {
      // Build tenant-only WHERE and params for non-range counts
      const tenantWhereSql = tenantClause; // either 'WHERE tenant_id = $1' or ''
      const tenantParamsLocal = tenantParams;

      const totalRes = await pg.query(
        `SELECT COUNT(*)::int AS total FROM deliveries ${tenantWhereSql}`,
        tenantParamsLocal,
      );
      const successWhere = tenantWhereSql
        ? `${tenantWhereSql} AND status = '${STATUS.DELIVERED}'`
        : `WHERE status = '${STATUS.DELIVERED}'`;
      const failedWhere = tenantWhereSql
        ? `${tenantWhereSql} AND status = '${STATUS.FAILED}'`
        : `WHERE status = '${STATUS.FAILED}'`;
      const successRes = await pg.query(
        `SELECT COUNT(*)::int AS success FROM deliveries ${successWhere}`,
        tenantParamsLocal,
      );
      const failedRes = await pg.query(
        `SELECT COUNT(*)::int AS failed FROM deliveries ${failedWhere}`,
        tenantParamsLocal,
      );

      // determine interval based on requested range
      let intervalSql = "'24 hours'";
      if (range === '7d') intervalSql = "'7 days'";
      if (range === '1m') intervalSql = "'30 days'";

      // Build WHERE clause correctly to avoid stray AND when tenantClause is empty
      const whereParts: string[] = [];
      const params = [] as any[];
      if (user && user.role !== 'admin' && user.tenantId) {
        whereParts.push(`tenant_id = $1`);
        params.push(user.tenantId);
      }
      whereParts.push(
        `created_at >= (clock_timestamp()::timestamptz(6) - interval ${intervalSql})`,
      );
      const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

      const periodRes = await pg.query(
        `SELECT COUNT(*)::int AS periodCount FROM deliveries ${whereSql}`,
        params,
      );
      const todayWhere = tenantWhereSql
        ? `${tenantWhereSql} AND created_at >= date_trunc('day', clock_timestamp()::timestamptz(6))`
        : `WHERE created_at >= date_trunc('day', clock_timestamp()::timestamptz(6))`;
      const todayRes = await pg.query(
        `SELECT COUNT(*)::int AS today FROM deliveries ${todayWhere}`,
        tenantParamsLocal,
      );

      totalDeliveries = Number(totalRes.rows?.[0]?.total || 0);
      successCount = Number(successRes.rows?.[0]?.success || 0);
      failedCount = Number(failedRes.rows?.[0]?.failed || 0);
      last24 = Number(periodRes.rows?.[0]?.periodcount || 0);
      today = Number(todayRes.rows?.[0]?.today || 0);

      // Per-channel summary (sent, success, failed, avg latency ms, retries)
      try {
        // fetch delivery rows so we can calculate latency against campaign.createdAt from Mongo
        const perRowsSql = `SELECT id, campaign_id, channel, created_at, COALESCE(updated_at, clock_timestamp()::timestamptz(6)) AS updated_at, attempt_count, status FROM deliveries ${whereSql}`;
        const perRowsRes = await pg.query(perRowsSql, params);
        const perRows = perRowsRes.rows || [];

        // collect campaign ids and fetch campaign createdAt from Mongo
        const campaignIds = Array.from(
          new Set(perRows.map((r: any) => r.campaign_id).filter(Boolean)),
        );
        const campaignMeta: Record<string, any> = {};
        if (campaignIds.length > 0 && mongo) {
          try {
            const col = mongo.db
              ? mongo.db().collection('campaigns')
              : mongo.collection('campaigns');
            const docs = await col
              .find({ _id: { $in: campaignIds } }, { projection: { createdAt: 1, created_at: 1 } })
              .toArray();
            for (const d of docs) campaignMeta[String(d._id)] = d;
          } catch (err) {
            // ignore campaign meta load errors
          }
        }

        const channelMap: Record<
          string,
          {
            sent: number;
            success: number;
            failed: number;
            totalLatencyMs: number;
            latencyCount: number;
            retries: number;
          }
        > = {};
        for (const r of perRows) {
          const ch = r.channel || 'unknown';
          if (!channelMap[ch])
            channelMap[ch] = {
              sent: 0,
              success: 0,
              failed: 0,
              totalLatencyMs: 0,
              latencyCount: 0,
              retries: 0,
            };
          channelMap[ch].sent += 1;
          if (r.status === STATUS.DELIVERED) channelMap[ch].success += 1;
          else channelMap[ch].failed += 1;
          channelMap[ch].retries += Math.max((r.attempt_count || 0) - 1, 0);

          const meta = r.campaign_id ? campaignMeta[String(r.campaign_id)] : null;
          const campaignCreated = meta?.createdAt || meta?.created_at || null;
          const baseTime = campaignCreated ? new Date(campaignCreated) : new Date(r.created_at);
          const updatedAt = new Date(r.updated_at);
          const latencyMs = Number(updatedAt.getTime()) - Number(baseTime.getTime());
          if (!Number.isNaN(latencyMs)) {
            channelMap[ch].totalLatencyMs += latencyMs;
            channelMap[ch].latencyCount += 1;
          }
        }

        perChannel = Object.keys(channelMap).map((ch) => {
          const v = channelMap[ch];
          return {
            channel: ch,
            sent: v.sent,
            success: v.success,
            failed: v.failed,
            avgLatencyMs: v.latencyCount ? v.totalLatencyMs / v.latencyCount : null,
            retries: v.retries,
          };
        });
      } catch (e) {
        // ignore per-channel failures
      }

      // Time-series buckets per channel
      try {
        const bucket = range === '24h' ? 'hour' : 'day';
        const tsSql = `SELECT date_trunc('${bucket}', created_at) AS bucket, channel,
          COUNT(*)::int AS sent,
          SUM(CASE WHEN status = '${STATUS.DELIVERED}' THEN 1 ELSE 0 END)::int AS success,
          SUM(CASE WHEN status = '${STATUS.FAILED}' THEN 1 ELSE 0 END)::int AS failed
          FROM deliveries
          ${whereSql}
          GROUP BY bucket, channel
          ORDER BY bucket ASC`;
        const tsRes = await pg.query(tsSql, params);
        // assemble buckets and series
        const buckets: string[] = [];
        const channelsMap: Record<string, { sent: number[]; success: number[]; failed: number[] }> =
          {};
        const rows = tsRes.rows || [];
        // collect unique bucket timestamps in order
        const bucketSet: string[] = [];
        rows.forEach((r: any) => {
          const b = new Date(r.bucket).toISOString();
          if (!bucketSet.includes(b)) bucketSet.push(b);
        });
        bucketSet.forEach((b) => buckets.push(b));
        // initialize channel arrays
        rows.forEach((r: any) => {
          const ch = r.channel || 'unknown';
          if (!channelsMap[ch])
            channelsMap[ch] = {
              sent: Array(buckets.length).fill(0),
              success: Array(buckets.length).fill(0),
              failed: Array(buckets.length).fill(0),
            };
          const idx = buckets.indexOf(new Date(r.bucket).toISOString());
          if (idx >= 0) {
            channelsMap[ch].sent[idx] = Number(r.sent || 0);
            channelsMap[ch].success[idx] = Number(r.success || 0);
            channelsMap[ch].failed[idx] = Number(r.failed || 0);
          }
        });
        // attach to output
        timeSeries = { buckets, channels: channelsMap };
      } catch (e) {
        // ignore
      }
    } catch (e) {
      totalDeliveries = 0;
      successCount = 0;
      failedCount = 0;
      last24 = 0;
      today = 0;
    }
  }

  // delivery success rate
  const denom = successCount + failedCount;
  const deliverySuccessRate = denom === 0 ? 0 : Math.round((successCount / denom) * 10000) / 100;

  // DLQ count (Redis stream length) - admin only, but we return 0 for tenants
  let dlqCount = 0;
  try {
    if (redis && user && user.role === 'admin') {
      if (typeof redis.xLen === 'function') dlqCount = await redis.xLen(STREAMS.DLQ);
      else if (typeof redis.xlen === 'function') dlqCount = await redis.xlen(STREAMS.DLQ);
      else {
        const items =
          typeof redis.xRange === 'function' ? await redis.xRange(STREAMS.DLQ, '-', '+') : [];
        dlqCount = Array.isArray(items) ? items.length : 0;
      }
    }
  } catch (e) {
    dlqCount = 0;
  }

  // Active tenants: distinct tenantId from campaigns collection (Mongo)
  let activeTenants = 0;
  try {
    if (mongo) {
      const db = mongo.db ? mongo.db() : mongo;
      const coll = db.collection('campaigns');
      const tenants = await coll.distinct('tenantId');
      activeTenants = Array.isArray(tenants) ? tenants.filter(Boolean).length : 0;
    }
  } catch (e) {
    activeTenants = 0;
  }

  return {
    totalDeliveries,
    successCount,
    failedCount,
    totalNotifications: { today, period: last24, range },
    deliverySuccessRate,
    dlqCount,
    activeTenants,
    perChannel: perChannel || [],
    timeSeries: timeSeries || { buckets: [], channels: {} },
  };
}

export default { getDashboardMetrics };
