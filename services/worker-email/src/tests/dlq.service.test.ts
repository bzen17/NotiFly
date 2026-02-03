import { writeDlq } from '../services/dlq.service';

describe('dlq.service', () => {
  test('writeDlq enqueues payload', async () => {
    const calls: any[] = [];
    const redis = {
      xAdd: jest.fn(async (_stream: string, _id: string, obj: any) => {
        calls.push(obj);
        return 'id-1';
      }),
    } as any;

    await expect(writeDlq(redis, { foo: 'bar' })).resolves.toBeUndefined();
    expect(calls.length).toBe(1);
    expect(JSON.parse(calls[0].payload)).toEqual({ foo: 'bar' });
  });

  test('writeDlq propagates error when redis fails', async () => {
    const redis = {
      xAdd: jest.fn(async () => {
        throw new Error('redis-fail');
      }),
    } as any;
    await expect(writeDlq(redis, { a: 1 })).rejects.toThrow('redis-fail');
  });
});
