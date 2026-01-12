export async function writeDlq(redis: any, payload: any) {
  try {
    await redis.xAdd('notifications.dlq', '*', { payload: JSON.stringify(payload) });
  } catch (err) {
    // best-effort DLQ write; surface to logs by rethrowing
    throw err;
  }
}
