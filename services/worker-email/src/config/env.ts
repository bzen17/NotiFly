import dotenv from 'dotenv';
dotenv.config();

// Redis: prefer an explicit URL override, otherwise build from parts
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = process.env.REDIS_PORT || '6379';
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || process.env.REDIS_PASS || '';
export const REDIS_URL =
  process.env.REDIS_URL ||
  (REDIS_PASSWORD
    ? `redis://:${encodeURIComponent(REDIS_PASSWORD)}@${REDIS_HOST}:${REDIS_PORT}`
    : `redis://${REDIS_HOST}:${REDIS_PORT}`);

// Mongo
export const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
export const MONGO_PORT = process.env.MONGO_PORT || '27017';
export const MONGO_USER = process.env.MONGO_USER || process.env.MONGO_USERNAME || '';
export const MONGO_PASS = process.env.MONGO_PASS || process.env.MONGO_PASSWORD || '';
export const MONGO_DB = process.env.MONGO_DB || 'notifly';

export const MONGO_URI =
  process.env.MONGO_URI ||
  (MONGO_USER && MONGO_PASS
    ? `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`
    : `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`);

// Postgres: prefer full connection string override, otherwise build from parts
export const PG_HOST = process.env.PG_HOST || 'localhost';
export const PG_PORT = process.env.PG_PORT || '5432';
export const PG_USER = process.env.PG_USER || 'postgres';
export const PG_PASS = process.env.PG_PASS || process.env.PG_PASSWORD || 'postgres';
export const PG_DB = process.env.PG_DB || 'notifly';
export const PG_CONNECTION =
  process.env.PG_CONNECTION ||
  process.env.DATABASE_URL ||
  `postgresql://${encodeURIComponent(PG_USER)}:${encodeURIComponent(PG_PASS)}@${PG_HOST}:${PG_PORT}/${PG_DB}`;

export const CONSUMER_GROUP = process.env.CONSUMER_GROUP || 'email-workers';
export const CONSUMER_NAME =
  process.env.CONSUMER_NAME || process.env.CONSUMER || 'email-consumer-1';
export const DEDUPE_TTL = Number(process.env.DEDUPE_TTL || 60);
export const POLL_BLOCK_MS = Number(process.env.POLL_BLOCK_MS || 5000);

export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const RATE_LIMIT = Number(process.env.RATE_LIMIT || '5');
export const RATE_WINDOW = Number(process.env.RATE_WINDOW || '1');
export const MAX_RETRIES = Number(process.env.MAX_RETRIES || '3');
export const STREAM = process.env.STREAM || 'notifications.email';
export const GROUP = process.env.GROUP || 'email-group';
export const CONSUMER = process.env.CONSUMER || 'email-consumer-1';

export const USE_MOCK = process.env.USE_MOCK === 'true' || process.env.USE_MOCK === '1';

export const RETRY_CONSUMER_ENABLED =
  process.env.RETRY_CONSUMER_ENABLED === 'false' || process.env.RETRY_CONSUMER_ENABLED === '0'
    ? false
    : true;

export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
export const SENDGRID_FROM = process.env.SENDGRID_FROM || process.env.SENDGRID_FROM_EMAIL || '';

export default {
  REDIS_URL,
  MONGO_URI,
  MONGO_DB,
  PG_CONNECTION,
  LOG_LEVEL,
  RATE_LIMIT,
  RATE_WINDOW,
  DEDUPE_TTL,
  MAX_RETRIES,
  STREAM,
  GROUP,
  CONSUMER,
  USE_MOCK,
  SENDGRID_API_KEY,
  SENDGRID_FROM,
};
