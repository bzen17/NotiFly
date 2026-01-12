import { EmailProvider, EmailSendParams, ProviderResponse } from '../interfaces/provider.interface';
import sgMail from '@sendgrid/mail';

const PROVIDER = 'sendgrid';

export class SendGridAdapter implements EmailProvider {
  private apiKey?: string;
  private defaultFrom?: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY;
    this.defaultFrom = process.env.SENDGRID_FROM;
    if (this.apiKey) sgMail.setApiKey(this.apiKey);
  }

  async send(params: EmailSendParams): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return { success: false, provider: PROVIDER, errorCode: 'MISSING_API_KEY' };
    }

    const from = params.from ?? this.defaultFrom;
    if (!from) {
      return { success: false, provider: PROVIDER, errorCode: 'MISSING_FROM' };
    }

    if (!params.to || typeof params.to !== 'string') {
      return { success: false, provider: PROVIDER, errorCode: 'INVALID_TO' };
    }

    const msg: any = {
      to: params.to,
      from,
      subject: params.subject || '',
      text: params.text || undefined,
      html: params.html || undefined,
    };

    try {
      const res = await sgMail.send(msg as any);
      const providerResp = Array.isArray(res) ? res[0] : res;
      return { success: true, provider: PROVIDER, rawResponse: providerResp };
    } catch (err: any) {
      const status = err?.code || err?.response?.statusCode || null;
      const body = err?.response?.body ?? err?.response ?? String(err);
      return {
        success: false,
        provider: PROVIDER,
        errorCode: status ? `SG_ERR_${status}` : 'SG_EXCEPTION',
        rawResponse: body,
      };
    }
  }
}
