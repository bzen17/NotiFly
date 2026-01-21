import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ERRORS } from '../constants';

/**
 * Express error handler. Logs the error and returns a 500 payload with `requestId`.
 */
export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || req.headers['x-request-id'] || null;
  try {
    logger.error({ err: { message: err?.message, stack: err?.stack }, path: req.path, requestId }, 'Unhandled error');
  } catch (e) {
    // ignore
  }
  res.status(500).json({ error: ERRORS.INTERNAL_ERROR || 'internal_error', requestId });
}
