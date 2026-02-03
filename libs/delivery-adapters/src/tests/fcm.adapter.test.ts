import { FcmAdapter } from '../push/fcm.adapter';

describe('FcmAdapter', () => {
  beforeEach(() => {
    delete process.env.FCM_SERVER_KEY;
  });

  test('missing server key', async () => {
    const a = new FcmAdapter();
    const res = await a.send({ to: 't', title: 'x' } as any);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('MISSING_SERVER_KEY');
  });

  test('invalid to', async () => {
    process.env.FCM_SERVER_KEY = 'k';
    const a = new FcmAdapter();
    const res = await a.send({ to: null, title: 'x' } as any);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('INVALID_TO');
  });

  test('simulated failure and success', async () => {
    process.env.FCM_SERVER_KEY = 'k';
    const a = new FcmAdapter();
    const fail = await a.send({ to: 'fail-device', title: 't' } as any);
    expect(fail.success).toBe(false);
    expect(fail.errorCode).toBe('SIMULATED_FAILURE');

    const ok = await a.send({ to: 'device-1', title: 't' } as any);
    expect(ok.success).toBe(true);
  });
});
