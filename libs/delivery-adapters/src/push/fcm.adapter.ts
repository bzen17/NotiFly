import { PushProvider, PushSendParams, ProviderResponse } from '../interfaces/provider.interface';

const PROVIDER = 'fcm';

export class FcmAdapter implements PushProvider {
  private serverKey?: string;

  constructor() {
    this.serverKey = process.env.FCM_SERVER_KEY;
  }

  async send(params: PushSendParams): Promise<ProviderResponse> {
    if (!this.serverKey) {
      return { success: false, provider: PROVIDER, errorCode: 'MISSING_SERVER_KEY' };
    }

    if (!params.to || typeof params.to !== 'string') {
      return { success: false, provider: PROVIDER, errorCode: 'INVALID_TO' };
    }

    if (params.to.includes('fail')) {
      return {
        success: false,
        provider: PROVIDER,
        errorCode: 'SIMULATED_FAILURE',
        rawResponse: { message: 'recipient triggered simulated failure' },
      };
    }

    const response = { messageId: `fcm_${Date.now()}`, to: params.to, title: params.title };
    return { success: true, provider: PROVIDER, rawResponse: response };
  }
}
