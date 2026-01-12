import { SmsProvider, SmsSendParams, ProviderResponse } from '../interfaces/provider.interface';

const PROVIDER = 'mock-sms';

export class MockSmsAdapter implements SmsProvider {
  constructor(private id = 'mock-sms') {}

  async send(params: SmsSendParams): Promise<ProviderResponse> {
    if (params.to && params.to.includes('fail')) {
      return {
        success: false,
        provider: PROVIDER,
        errorCode: 'MOCK_FAILURE',
        rawResponse: { reason: 'recipient contains fail' },
      };
    }

    return {
      success: true,
      provider: PROVIDER,
      rawResponse: { to: params.to, body: params.body, id: `${this.id}_${Date.now()}` },
    };
  }
}
