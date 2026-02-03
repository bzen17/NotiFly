import { scheduleRetry, shouldRetry } from '../services/retry.service';

describe('retry.service', () => {
  test('shouldRetry respects max retries', () => {
    expect(shouldRetry(0)).toBe(true);
    expect(shouldRetry(100)).toBe(false);
  });

  test('scheduleRetry enqueues to redis and updates mongo when provided', async () => {
    const calls: any[] = [];
    const redis = {
      xAdd: jest.fn(async (_stream: string, _id: string, obj: any) => {
        calls.push({ type: 'xAdd', obj });
        return 'id-1';
      }),
    };
    const campaignsColl = {
      updateOne: jest.fn(async () => ({ acknowledged: true })),
    };
    const mongo = { db: () => ({ collection: () => campaignsColl }) } as any;

    const campaign: any = { _id: 'c1', recipient: 'r1', tenantId: 't1' };
    const ok = await scheduleRetry(redis as any, campaign, 1, mongo as any);
    expect(ok).toBe(true);
    expect(calls.length).toBeGreaterThan(0);
    expect(campaignsColl.updateOne).toHaveBeenCalled();
  });
});
