import { EmailProvider, EmailSendParams, ProviderResponse } from '../interfaces/provider.interface';

const PROVIDER = 'ses';

export class SESAdapter implements EmailProvider {
  // Stub: intentionally not implemented as per library spec. Throwing to signal caller.
  async send(_params: EmailSendParams): Promise<ProviderResponse> {
    return {
      success: false,
      provider: PROVIDER,
      errorCode: 'NOT_IMPLEMENTED',
      rawResponse: { message: 'SESAdapter is not implemented in @notifly/delivery-adapters' },
    };
  }
}
