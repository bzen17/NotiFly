export type CampaignStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  status: CampaignStatus;
  totalDeliveries: number;
  successCount: number;
  failedCount: number;
}

export interface DeliveryItem {
  id: string;
  recipient: string;
  channel: string;
  status: string;
  attemptCount: number;
  lastError?: string;
  updatedAt: string;
}
