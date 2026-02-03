import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './middlewares/error.middleware';
import campaignsRouter from './routes/campaigns.routes';
import dlqRouter from './routes/dlq.routes';
import authRouter from './routes/auth.routes';
import dashboardRouter from './routes/dashboard.routes';
import { authMiddleware } from './middlewares/auth.middleware';
import { requestLogger } from './middlewares/request.middleware';
import { FRONTEND_ORIGIN } from './config/env';

const app = express();

// Allow JSON bodies
app.use(express.json());

// Request logging for tracing API flow
app.use(requestLogger);

// Enable CORS for the internal frontend and local development.
// Allow the configured FRONTEND_ORIGIN (production) and localhost/127.0.0.1 on any port.
const allowedOrigins = new Set([FRONTEND_ORIGIN]);

const isLocalOrigin = (origin?: string) => {
  if (!origin) return false;
  return (
    /https?:\/\/localhost(:\d+)?$/i.test(origin) || /https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)
  );
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin) || isLocalOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  }),
);

// Public auth endpoints
app.use('/v1/auth', authRouter);

// Protect all other /v1 endpoints
app.use('/v1', authMiddleware);

app.use('/v1/campaigns', campaignsRouter);
app.use('/v1/dlq', dlqRouter);
app.use('/v1/dashboard', dashboardRouter);

// Global error handler last
app.use(errorMiddleware as any);

export default app;
