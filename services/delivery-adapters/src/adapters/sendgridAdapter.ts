export interface DeliveryResult {
  success: boolean;
  code?: string;
  providerResponse?: any;
  error?: string;
}

import cfg from '../config';
import sgMail from '@sendgrid/mail';

export async function deliver(payload: {
  to: string;
  subject?: string;
  body?: string;
  metadata?: Record<string, any>;
}): Promise<DeliveryResult> {
  console.info(
    '[sendgridAdapter] deliver called to=%s subject=%s',
    payload.to,
    payload.subject || '',
  );

  if (cfg.USE_MOCK) {
    console.info('[sendgridAdapter] USE_MOCK=true, returning mocked success');
    await new Promise((r) => setTimeout(r, 50));
    return { success: true, code: 'MOCK_OK', providerResponse: { mocked: true } };
  }

  const apiKey = cfg.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('[sendgridAdapter] missing SENDGRID_API_KEY');
    return { success: false, code: 'NO_API_KEY', providerResponse: 'missing SENDGRID_API_KEY' };
  }

  const from = cfg.SENDGRID_FROM || 'no-reply@example.com';

  sgMail.setApiKey(apiKey);

  const msg: any = {
    to: payload.to,
    from,
    subject: payload.subject || '',
    html: payload.body || '',
    customArgs: payload.metadata || {},
  };

  try {
    console.info('[sendgridAdapter] sending to SendGrid: to=%s', payload.to);
    const res = await sgMail.send(msg);
    const providerResponse = Array.isArray(res) ? res[0] : res;
    console.info('[sendgridAdapter] send success to=%s', payload.to);
    return { success: true, code: 'SG_OK', providerResponse };
  } catch (err: any) {
    console.error('[sendgridAdapter] send error to=%s error=%o', payload.to, err?.message ?? err);
    const sgErrBody = err?.response?.body ?? err?.response ?? null;
    const status = err?.code || err?.response?.statusCode || null;
    return {
      success: false,
      code: status ? `SG_ERR_${status}` : 'SG_EXCEPTION',
      providerResponse: sgErrBody ?? String(err),
      error: err?.message,
    };
  }
}

export default { deliver };
