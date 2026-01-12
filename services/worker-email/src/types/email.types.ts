export interface EmailPayload {
  eventId: string;
  tenantId?: string;
  to: string;
  subject?: string;
  body?: string;
  metadata?: Record<string, any>;
}
