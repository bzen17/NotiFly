import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './middlewares/error.middleware';
import campaignsRouter from './routes/campaigns.routes';
import dlqRouter from './routes/dlq.routes';
import authRouter from './routes/auth.routes';
import dashboardRouter from './routes/dashboard.routes';
import { authMiddleware } from './middlewares/auth.middleware';
import { requestLogger } from './middlewares/request.middleware';

const app = express();

// Allow JSON bodies
app.use(express.json());

// Request logging for tracing API flow
app.use(requestLogger);

// Enable CORS for the internal frontend. Use FRONTEND_ORIGIN env var in production if needed.
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin }));

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
