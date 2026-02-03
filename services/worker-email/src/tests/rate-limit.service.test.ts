import { allowRate } from '../services/rate-limit.service';

describe('rate-limit.service', () => {
  test('allowRate allows up to limit and then denies', async () => {
    const counters = new Map<string, number>();
    const redis: any = {
      incr: jest.fn(async (k: string) => {
        const v = (counters.get(k) || 0) + 1;
        counters.set(k, v);
        return v;
      }),
      expire: jest.fn(async () => true),
    };

    const tenant = 't1';
    const l1 = await allowRate(redis, tenant, 2, 60);
    expect(l1).toBe(true);
    const l2 = await allowRate(redis, tenant, 2, 60);
    expect(l2).toBe(true);
    const l3 = await allowRate(redis, tenant, 2, 60);
    expect(l3).toBe(false);
  });
});
