export class ProviderError extends Error {
  public code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
  }
}
