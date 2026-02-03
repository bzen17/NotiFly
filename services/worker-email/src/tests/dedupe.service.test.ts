import { setDedupKey, isDuplicate } from '../services/dedupe.service';

describe('dedupe.service', () => {
  test('setDedupKey returns true when key set first time and false when exists', async () => {
    const store = new Map<string, string>();
    const redis: any = {
      set: jest.fn(async (k: string, v: string, opts: any) => {
        if (store.has(k)) return null;
        store.set(k, v);
        return 'OK';
      }),
    };
    const ok1 = await setDedupKey(redis, 'k1', 10);
    expect(ok1).toBe(true);
    const ok2 = await setDedupKey(redis, 'k1', 10);
    expect(ok2).toBe(false);
  });

  test('isDuplicate returns true when key exists', async () => {
    const store = new Map<string, string>();
    store.set('k2', '1');
    const redis: any = {
      set: jest.fn(async (k: string, v: string, opts: any) => {
        if (store.has(k)) return null;
        store.set(k, v);
        return 'OK';
      }),
    };
    const dup = await isDuplicate(redis, 'k2', 10);
    expect(dup).toBe(true);
  });
});
