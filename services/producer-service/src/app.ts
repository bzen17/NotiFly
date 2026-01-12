import express from 'express';
import notificationsRouter from './routes/notifications.routes';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

app.use(express.json());

app.use('/v1/notifications', notificationsRouter);

// Global error handler last
app.use(errorMiddleware as any);

export default app;
