import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || '3001';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
export const REDIS_HOST = process.env.REDIS_HOST || process.env.REDIS_URL || 'localhost';
export const REDIS_PORT = process.env.REDIS_PORT || '6379';
export const REDIS_URL =
  process.env.REDIS_URL ||
  (REDIS_HOST.startsWith('redis://') ? REDIS_HOST : `redis://${REDIS_HOST}:${REDIS_PORT}`);

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

export const JWT_SECRET = process.env.JWT_SECRET || 'REDACTED';
export const JWT_ACCESS_EXP = process.env.JWT_ACCESS_EXP || '15m';
export const JWT_REFRESH_EXP = process.env.JWT_REFRESH_EXP || '7d';
