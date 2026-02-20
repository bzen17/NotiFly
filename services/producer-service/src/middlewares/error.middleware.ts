import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ERRORS } from '../constants';

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || req.headers['x-request-id'] || null;
  try {
    logger.error(
      { err: { message: err?.message, stack: err?.stack }, path: req.path, requestId },
      'Unhandled error',
    );
  } catch (e) {
    logger.warn({ err: e }, 'Error while logging unhandled error');
  }
  res.status(500).json({ error: ERRORS.INTERNAL_ERROR || 'internal_error', requestId });
}
