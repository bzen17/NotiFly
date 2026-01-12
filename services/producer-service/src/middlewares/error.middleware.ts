import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: 'internal_error' });
}
