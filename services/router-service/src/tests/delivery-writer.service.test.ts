import { writeDeliveryRecord } from '../services/delivery-writer.service';

describe('delivery-writer.service', () => {
  test('resolves true for a write', async () => {
    const row = { campaignId: 'c1', recipient: 'x' };
    const res = await writeDeliveryRecord(row);
    expect(res).toBeTruthy();
  });
});
