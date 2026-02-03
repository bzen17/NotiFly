import { SendGridAdapter } from '../email/sendgrid.adapter';

describe('SendGridAdapter', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM;
  });

  test('returns missing api key error when not configured', async () => {
    jest.doMock('@sendgrid/mail', () => ({ setApiKey: jest.fn(), send: jest.fn() }));
    const a = (await import('../email/sendgrid.adapter')).SendGridAdapter;
    const inst = new a();
    const res = await inst.send({ to: 'x@x.com', subject: 's' } as any);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('MISSING_API_KEY');
  });

  test('sends successfully when sdk resolves', async () => {
    process.env.SENDGRID_API_KEY = 'k';
    process.env.SENDGRID_FROM = 'noreply@test.com';
    jest.doMock('@sendgrid/mail', () => ({
      setApiKey: jest.fn(),
      send: jest.fn().mockResolvedValue([{ statusCode: 202, body: {} }]),
    }));

    const a = (await import('../email/sendgrid.adapter')).SendGridAdapter;
    const inst = new a();
    const res = await inst.send({ to: 'u@test.com', subject: 'hi' } as any);
    expect(res.success).toBe(true);
    expect(res.provider).toBe('sendgrid');
  });

  test('maps sdk failure to errorCode', async () => {
    process.env.SENDGRID_API_KEY = 'k';
    process.env.SENDGRID_FROM = 'noreply@test.com';
    const err: any = new Error('boom');
    err.code = 500;
    err.response = { body: { errors: ['e'] }, statusCode: 500 };
    jest.doMock('@sendgrid/mail', () => ({
      setApiKey: jest.fn(),
      send: jest.fn().mockRejectedValue(err),
    }));

    const a = (await import('../email/sendgrid.adapter')).SendGridAdapter;
    const inst = new a();
    const res = await inst.send({ to: 'u@test.com', subject: 'hi' } as any);
    expect(res.success).toBe(false);
    expect(
      (res.errorCode as string).startsWith('SG_ERR_') || res.errorCode === 'SG_EXCEPTION',
    ).toBe(true);
  });
});
