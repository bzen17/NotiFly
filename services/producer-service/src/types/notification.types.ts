export interface NotificationPayload {
  tenantId: string;
  recipients: string[];
  payload: Record<string, any>;
}

export interface SendResult {
  campaignId: string;
}
