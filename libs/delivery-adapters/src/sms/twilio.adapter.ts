import { SmsProvider, SmsSendParams, ProviderResponse } from '../interfaces/provider.interface';

const PROVIDER = 'twilio';

export class TwilioAdapter implements SmsProvider {
  private accountSid?: string;
  private authToken?: string;
  private defaultFrom?: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.defaultFrom = process.env.TWILIO_FROM;
  }

  async send(params: SmsSendParams): Promise<ProviderResponse> {
    if (!this.accountSid || !this.authToken) {
      return { success: false, provider: PROVIDER, errorCode: 'MISSING_CREDENTIALS' };
    }

    const from = params.from ?? this.defaultFrom;
    if (!from) {
      return { success: false, provider: PROVIDER, errorCode: 'MISSING_FROM' };
    }

    if (!params.to || typeof params.to !== 'string') {
      return { success: false, provider: PROVIDER, errorCode: 'INVALID_TO' };
    }

    // Do not perform network calls in the library — simulate deterministically
    if (params.to.includes('fail')) {
      return {
        success: false,
        provider: PROVIDER,
        errorCode: 'SIMULATED_FAILURE',
        rawResponse: { message: 'recipient triggered simulated failure' },
      };
    }

    const response = { sid: `tw_${Date.now()}`, to: params.to, from, body: params.body };
    return { success: true, provider: PROVIDER, rawResponse: response };
  }
}
