import dotenv from 'dotenv';

dotenv.config();

export const PORT = Number(process.env.DELIVERY_ADAPTERS_PORT || process.env.PORT || 3010);
export const USE_MOCK = String(process.env.USE_MOCK || 'false') === 'true';
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
export const SENDGRID_FROM = process.env.SENDGRID_FROM || 'no-reply@example.com';

export default {
  PORT,
  USE_MOCK,
  SENDGRID_API_KEY,
  SENDGRID_FROM,
};
