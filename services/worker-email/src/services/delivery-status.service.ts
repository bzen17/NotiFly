export async function markDeliveryStatus(mongo: any, eventId: string, status: string) {
  try {
    const db = typeof mongo.db === 'function' ? mongo.db() : mongo;
    const events = db.collection('events');
    const update: any = { status };
    if (status === 'delivered') {
      update.lastDeliveredAt = new Date();
    }
    await events.updateOne({ _id: eventId }, { $set: update });
    return true;
  } catch (err) {
    // best-effort, return false on error
    return false;
  }
}
