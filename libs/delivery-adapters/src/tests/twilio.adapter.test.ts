import { TwilioAdapter } from '../sms/twilio.adapter';

describe('TwilioAdapter', () => {
  beforeEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM;
  });

  test('returns missing credentials when not configured', async () => {
    const a = new TwilioAdapter();
    const res = await a.send({ to: 't', body: 'b' } as any);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('MISSING_CREDENTIALS');
  });

  test('returns missing from when not provided', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'sid';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    const a = new TwilioAdapter();
    const res = await a.send({ to: 't', body: 'b' } as any);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('MISSING_FROM');
  });

  test('simulated failure for to contains fail', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'sid';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    process.env.TWILIO_FROM = '+1000';
    const a = new TwilioAdapter();
    const res = await a.send({ to: 'fail@example.com', body: 'b' } as any);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('SIMULATED_FAILURE');
  });

  test('success path returns provider response', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'sid';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    process.env.TWILIO_FROM = '+1000';
    const a = new TwilioAdapter();
    const res = await a.send({ to: 'ok@example.com', body: 'b' } as any);
    expect(res.success).toBe(true);
    expect(res.rawResponse).toHaveProperty('sid');
  });
});
