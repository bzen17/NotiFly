import { Router } from 'express';
import { sendNotificationController } from '../controllers/notifications.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Protect the send endpoint with a simple API-key middleware
router.post('/send', authMiddleware, sendNotificationController);

export default router;
