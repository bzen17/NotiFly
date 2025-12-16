import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

export interface DeliveryResult {
  success: boolean;
  code?: string;
  providerResponse?: any;
  error?: string;
}

const DELIVERY_URL = process.env.DELIVERY_ADAPTERS_URL || 'http://localhost:3010/deliver';

export async function deliver(payload: any): Promise<DeliveryResult> {
  try {
    const res = await axios.post(DELIVERY_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: Number(process.env.DELIVERY_CLIENT_TIMEOUT_MS || 10000),
    });
    // Axios already parses JSON
    return res.data as DeliveryResult;
  } catch (err: any) {
    // Normalize axios error shapes
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      return { success: false, code: `HTTP_${status}`, providerResponse: data, error: err.message };
    }
    return {
      success: false,
      code: 'DELIVERY_CLIENT_ERROR',
      providerResponse: String(err),
      error: err?.message,
    };
  }
}

export default { deliver };
