import { SendGridAdapter, SESAdapter, MockEmailAdapter } from '@notifly/delivery-adapters';
import { USE_MOCK } from '../config/env';

export function getEmailAdapter(provider?: string) {
  if (USE_MOCK || provider === 'mock') {
    return new MockEmailAdapter();
  }

  if (provider === 'ses') {
    return new SESAdapter();
  }

  // default to SendGrid
  return new SendGridAdapter();
}

export default {
  getEmailAdapter,
};
