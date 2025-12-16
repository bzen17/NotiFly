import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || '3001';

export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = process.env.REDIS_PORT || '6379';
export const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;

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

export default {
  PORT,
  REDIS_URL,
  MONGO_URI,
  MONGO_DB,
};
