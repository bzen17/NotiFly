export interface EmailPayload {
  campaignId: string;
  tenantId?: string;
  to: string;
  subject?: string;
  body?: string;
  metadata?: Record<string, any>;
}
