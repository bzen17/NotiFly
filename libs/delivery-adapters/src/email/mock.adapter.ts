import { EmailProvider, EmailSendParams, ProviderResponse } from '../interfaces/provider.interface';

const PROVIDER = 'mock-email';

export class MockEmailAdapter implements EmailProvider {
  constructor(private id = 'mock-email') {}

  async send(params: EmailSendParams): Promise<ProviderResponse> {
    // Deterministic: if recipient contains 'fail' => failure
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
      rawResponse: { to: params.to, subject: params.subject, id: `${this.id}_${Date.now()}` },
    };
  }
}
