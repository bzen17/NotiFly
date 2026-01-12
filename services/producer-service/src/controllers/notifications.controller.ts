import { Request, Response } from 'express';
import { sendNotification } from '../services/notification.service';
import logger from '../utils/logger';

export async function sendNotificationController(req: Request, res: Response) {
  try {
    const result = await sendNotification(req.body);
    return res.status(202).json({ eventId: result.eventId });
  } catch (err: any) {
    if (err && err.message === 'validation_error') {
      logger.info({ err }, 'validation error in sendNotificationController');
      return res.status(400).json({ error: 'validation_error', details: err.details });
    }
    logger.error({ err }, 'Unhandled error in sendNotificationController');
    return res.status(500).json({ error: 'internal_error' });
  }
}
