export type CampaignPayload = {
  _id?: string;
  campaignId: string;
  templateId?: string;
  payload?: Record<string, any>;
  recipients?: Array<{ address: string; channels: string[] | string }>;
  [k: string]: any;
};

export type DeliveryRow = {
  id: string;
  campaign_id: string;
  recipient: string;
  channel: string;
  status: string;
  payload: any;
};
