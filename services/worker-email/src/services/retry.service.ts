import { MAX_RETRIES } from '../config/env';

export async function scheduleRetry(redis: any, event: any, attempt: number) {
  // Exponential backoff: min(1 hour, 5 * 2^attempt) seconds
  const backoff = Math.min(60 * 60, Math.pow(2, attempt) * 5);
  const payload = { eventId: event._id, attempt, when: Date.now() + backoff * 1000 };
  await redis.xAdd('notifications.retry', '*', { payload: JSON.stringify(payload) });
  return true;
}

export function shouldRetry(attempt: number) {
  return attempt <= MAX_RETRIES;
}
