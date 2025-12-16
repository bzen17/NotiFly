export interface DeliveryResult {
  success: boolean;
  code?: string;
  error?: string;
}

export async function sendEmail(recipient: string, payload: any): Promise<DeliveryResult> {
  // Simulate variable success/failure for testing
  // For example: fail if recipient contains 'fail', else succeed
  await new Promise((r) => setTimeout(r, 50));
  if (recipient.includes('fail')) {
    return { success: false, code: 'SIM_FAIL', error: 'simulated failure' };
  }
  return { success: true };
}
