import { STATUS } from '../constants';

export async function markDeliveryStatus(mongo: any, campaignId: string, status: string) {
  try {
    const db = typeof mongo.db === 'function' ? mongo.db() : mongo;
    const campaign = db.collection('campaigns');
    const update: any = { status };
    if (status === STATUS.DELIVERED) {
      update.lastDeliveredAt = new Date();
    }
    await campaign.updateOne({ _id: campaignId }, { $set: update });
    return true;
  } catch (err) {
    // best-effort, return false on error
    return false;
  }
}
