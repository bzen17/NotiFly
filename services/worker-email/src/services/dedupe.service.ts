import { DEDUPE_TTL } from '../config/env';

export async function setDedupKey(redis: any, key: string, ttl = DEDUPE_TTL) {
  // returns true when key was set (not a duplicate), false when key already existed
  const res = await redis.set(key, '1', { NX: true, EX: ttl });
  return res !== null;
}

export async function isDuplicate(redis: any, key: string, ttl = DEDUPE_TTL) {
  // convenience: returns true if duplicate (already exists)
  const setRes = await redis.set(key, '1', { NX: true, EX: ttl });
  return setRes === null;
}
