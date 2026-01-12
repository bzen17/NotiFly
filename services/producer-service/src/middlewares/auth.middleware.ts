import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Placeholder auth - replace with real token checks
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey) return res.status(401).json({ error: 'unauthorized' });
  return next();
}
