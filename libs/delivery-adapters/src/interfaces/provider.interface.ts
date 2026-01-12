export interface ProviderResponse {
  success: boolean;
  provider: string;
  errorCode?: string;
  rawResponse?: unknown;
}

export interface EmailSendParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SmsSendParams {
  to: string;
  from?: string;
  body: string;
}

export interface PushSendParams {
  to: string; // device token or topic
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export interface EmailProvider {
  send(params: EmailSendParams): Promise<ProviderResponse>;
}

export interface SmsProvider {
  send(params: SmsSendParams): Promise<ProviderResponse>;
}

export interface PushProvider {
  send(params: PushSendParams): Promise<ProviderResponse>;
}
