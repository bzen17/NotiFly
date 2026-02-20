import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getMongo } from '../config/db';
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

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const demoFlag = (process.env.DEMO_AUTH_ENABLED || '').toLowerCase();
    const demoEnabled = demoFlag === '1' || demoFlag === 'true';
    if ((process.env.NODE_ENV !== 'production' || demoEnabled) && req.headers['x-demo-auth']) {
      let demoTenant = process.env.DEMO_TENANT_ID;
      if (!demoTenant) {
        try {
          const mongo = getMongo();
          const db = (mongo as any).db ? (mongo as any).db() : mongo;
          const users = db.collection('users');
          const admin = await users.findOne({ role: 'admin', tenantId: { $exists: true } });
          if (admin && admin.tenantId) demoTenant = admin.tenantId;
        } catch (e) {
          logger.warn({ err: e }, 'Failed to lookup admin tenant for demo auth');
        }
      }
      if (!demoTenant) demoTenant = 'demo-tenant';
      req.user = { id: 'demo-admin', email: 'demo@local', role: 'admin', tenantId: demoTenant };
      logger.info(
        { path: req.path, method: req.method, demoEnabled, demoTenant },
        'Demo auth applied',
      );
      return next();
    }
  } catch (e) {
    logger.warn({ err: e }, 'Error while checking demo auth');
  }

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

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: ERRORS.FORBIDDEN });
    if (req.user.role !== role) return res.status(403).json({ error: ERRORS.FORBIDDEN });
    return next();
  };
}
