import { DEDUPE_TTL } from '../config/env';

export async function setDedupKey(redis: any, key: string, ttl = DEDUPE_TTL) {
  const res = await redis.set(key, '1', { NX: true, EX: ttl });
  return res !== null;
}

export async function isDuplicate(redis: any, key: string, ttl = DEDUPE_TTL) {
  const setRes = await redis.set(key, '1', { NX: true, EX: ttl });
  return setRes === null;
}
