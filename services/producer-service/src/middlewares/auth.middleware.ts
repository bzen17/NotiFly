import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { ERRORS, JWT_DEFAULTS } from '../constants';

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  tenantId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to validate Bearer JWT and attach `req.user`.
 * Responds with 401 on missing/invalid tokens.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = (req.headers.authorization || '').split(' ');
  if (auth.length !== 2 || auth[0] !== 'Bearer') {
    logger.info({ path: req.path, method: req.method }, 'Missing Authorization header');
    return res.status(401).json({ error: ERRORS.REFRESH_REQUIRED || 'missing_token' });
  }
  const token = auth[1];
  try {
    const payload = jwt.verify(token, JWT_DEFAULTS.JWT_SECRET) as any;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
    logger.info({ userId: req.user.id, path: req.path }, 'Authenticated request');
    return next();
  } catch (err) {
    logger.info({ err }, 'Invalid token in Authorization header');
    return res.status(401).json({ error: ERRORS.INVALID_REFRESH || 'invalid_token' });
  }
}

/**
 * Require a specific role on the authenticated user.
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: ERRORS.FORBIDDEN });
    if (req.user.role !== role) return res.status(403).json({ error: ERRORS.FORBIDDEN });
    return next();
  };
}
