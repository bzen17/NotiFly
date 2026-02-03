import { markDeliveryStatus } from '../services/delivery-status.service';

describe('delivery-status.service', () => {
  test('markDeliveryStatus updates mongo and returns true', async () => {
    const campaigns = { updateOne: jest.fn(async () => ({ acknowledged: true })) };
    const db = { collection: () => campaigns };
    const mongo: any = { db: () => db };
    const ok = await markDeliveryStatus(mongo, 'c1', 'delivered');
    expect(ok).toBe(true);
    expect(campaigns.updateOne).toHaveBeenCalledWith({ _id: 'c1' }, expect.any(Object));
  });

  test('returns false on error', async () => {
    const mongo: any = {
      db: () => ({
        collection: () => ({
          updateOne: () => {
            throw new Error('boom');
          },
        }),
      }),
    };
    const ok = await markDeliveryStatus(mongo, 'c2', 'failed');
    expect(ok).toBe(false);
  });
});
