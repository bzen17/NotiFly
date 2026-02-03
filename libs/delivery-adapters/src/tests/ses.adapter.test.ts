import { SESAdapter } from '../email/ses.adapter';

describe('SESAdapter', () => {
  test('returns not implemented response', async () => {
    const a = new SESAdapter();
    const res = await a.send({ to: 'x', subject: 's' } as any);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('NOT_IMPLEMENTED');
  });
});
