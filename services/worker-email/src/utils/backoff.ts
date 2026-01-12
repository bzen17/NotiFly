export function backoff(attempt: number) {
  return Math.min(60 * 60, Math.pow(2, attempt) * 5) * 1000;
}
