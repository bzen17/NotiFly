export interface DeliveryResult {
  success: boolean;
  code?: string;
  providerResponse?: any;
  error?: string;
}

export async function deliver(_payload: any): Promise<DeliveryResult> {
  console.info('[mockAdapter] deliver called, payload=%o', _payload);
  // Simulate work and success
  await new Promise((r) => setTimeout(r, 50));
  console.info('[mockAdapter] deliver returning success');
  return { success: true, code: 'MOCK_OK', providerResponse: { mocked: true } };
}

export default { deliver };
