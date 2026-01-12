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

// Support separate Mongo env vars: MONGO_HOST, MONGO_PORT, MONGO_USER, MONGO_PASS, MONGO_DB
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
  `postgresql://${encodeURIComponent(PG_USER)}:${encodeURIComponent(PG_PASS)}@${PG_HOST}:${PG_PORT}/${PG_DB}`;
export const CONSUMER_GROUP = process.env.CONSUMER_GROUP || 'router-group';
export const CONSUMER_NAME = process.env.CONSUMER_NAME || 'router-1';
export const DEDUPE_TTL_SECONDS = Number(process.env.DEDUPE_TTL_SECONDS || '86400');
export const POLL_BLOCK_MS = Number(process.env.POLL_BLOCK_MS || '5000');

export const INCOMING_STREAM = 'notifications.incoming';
export const STREAM_EMAIL = 'notifications.email';
export const STREAM_SMS = 'notifications.sms';
export const STREAM_PUSH = 'notifications.push';
