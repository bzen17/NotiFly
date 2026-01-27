// Validate and export required env vars for producer-service using the shared env-validator
import { z } from 'zod';
import { validateEnv } from '@notifly/env-validator';

const schema = z.object({
  PG_CONNECTION: z.string().min(1, 'PG_CONNECTION is required'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  JWT_SECRET: z.string().optional(),
});

export type ProducerEnv = z.infer<typeof schema>;

export const env = validateEnv<ProducerEnv>(schema);

// Usage: import { env } from './config/validateEnv' at service bootstrap
