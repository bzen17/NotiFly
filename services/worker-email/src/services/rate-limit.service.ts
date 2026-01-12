import { RATE_LIMIT, RATE_WINDOW } from '../config/env';

export async function allowRate(
  redis: any,
  tenantId: string,
  limit = RATE_LIMIT,
  windowSeconds = RATE_WINDOW,
) {
  const key = `rate:${tenantId}`;
  const v = await redis.incr(key);
  if (v === 1) {
    await redis.expire(key, windowSeconds);
  }
  return v <= limit;
}
