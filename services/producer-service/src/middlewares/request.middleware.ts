import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

/**
 * Safely serialize request/response bodies for logging.
 * - Returns `null` for empty values
 * - Truncates very large payloads
 * - Returns a marker for unserializable values
 */
function safeBody(obj: any) {
  try {
    if (!obj) return null;
    // avoid logging huge payloads
    const s = JSON.stringify(obj);
    if (s.length > 1000) return { _truncated: true, length: s.length };
    return JSON.parse(s);
  } catch (e) {
    return { _unserializable: true };
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).requestId = requestId;

  try {
    logger.info(
      { requestId, method: req.method, path: req.path, query: req.query, body: safeBody(req.body), user: (req as any).user?.id || null },
      'Incoming request',
    );
  } catch (e) {
    // ignore logging problems
  }

  // Intercept json/send to capture response payload
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let responsePayload: any = undefined;

  res.json = (body: any) => {
    responsePayload = body;
    try {
      logger.info({ requestId, method: req.method, path: req.path, status: res.statusCode, response: safeBody(body) }, 'Sending JSON response');
    } catch (e) {
      // ignore
    }
    return originalJson(body);
  };

  res.send = (body?: any) => {
    if (body && typeof body !== 'string') responsePayload = body;
    try {
      logger.info({ requestId, method: req.method, path: req.path, status: res.statusCode, response: typeof body === 'string' ? '[string]' : safeBody(body) }, 'Sending response');
    } catch (e) {
      // ignore
    }
    return originalSend(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    try {
      logger.info({ requestId, method: req.method, path: req.path, status: res.statusCode, duration }, 'Request handled');
    } catch (e) {
      // ignore
    }
  });

  next();
}
