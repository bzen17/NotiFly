import { Request, Response } from 'express';
import logger from '../utils/logger';
import { listDlq, requeueDlq, requeueDeliveryRow, requeueCampaign } from '../services/dlq.service';
import { ERRORS } from '../constants';

/**
 * Controllers for DLQ listing and requeue operations.
 */

export async function listDlqController(req: Request, res: Response) {
  logger.info({ user: (req as any).user?.id || null, query: req.query }, 'listDlqController');
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 50);
    const filter: any = { ...(req.query || {}) };
    const user = (req as any).user;
    if (user && user.role === 'tenant') {
      filter.tenantId = user.tenantId || user.id;
    }
    const data = await listDlq({ page, limit, filter });
    return res.json(data);
  } catch (err) {
    const requestId = (req as any).requestId || null;
    logger.error({ err, requestId }, 'listDlqController error');
    return res.status(500).json({ error: ERRORS.INTERNAL_ERROR });
  }
}

export async function requeueDlqController(req: Request, res: Response) {
  logger.info({ user: (req as any).user?.id || null, params: req.params }, 'requeueDlqController');
  try {
    const { deliveryId } = req.params;
    const user = (req as any).user;
    const result = await requeueDlq(deliveryId, user);
    return res.status(202).json({ status: 'accepted', requeueLockedUntil: result?.requeueLockedUntil });
  } catch (err: any) {
    const requestId = (req as any).requestId || null;
    logger.error({ err, requestId }, 'requeueDlqController error');
    if (err && err.code === ERRORS.LOCKED)
      return res.status(409).json({ error: ERRORS.LOCKED, requeueLockedUntil: err.requeueLockedUntil });
    if (err && err.message === ERRORS.NOT_FOUND) return res.status(404).json({ error: ERRORS.NOT_FOUND });
    return res.status(500).json({ error: ERRORS.INTERNAL_ERROR });
  }
}

export async function requeueDeliveryRowController(req: Request, res: Response) {
  logger.info({ user: (req as any).user?.id || null, params: req.params }, 'requeueDeliveryRowController');
  try {
    const { deliveryId } = req.params;
    const user = (req as any).user;
    const result = await requeueDeliveryRow(deliveryId, user);
    return res.status(202).json({ status: 'accepted', requeueLockedUntil: result?.requeueLockedUntil });
  } catch (err: any) {
    const requestId = (req as any).requestId || null;
    logger.error({ err, requestId }, 'requeueDeliveryRowController error');
    if (err && err.code === ERRORS.LOCKED)
      return res.status(409).json({ error: ERRORS.LOCKED, requeueLockedUntil: err.requeueLockedUntil });
    if (err && err.message === ERRORS.NOT_FOUND) return res.status(404).json({ error: ERRORS.NOT_FOUND });
    return res.status(500).json({ error: ERRORS.INTERNAL_ERROR });
  }
}

export async function requeueCampaignController(req: Request, res: Response) {
  logger.info({ user: (req as any).user?.id || null, params: req.params }, 'requeueCampaignController');
  try {
    const { campaignId } = req.params;
    const user = (req as any).user;
    const result = await requeueCampaign(campaignId, user);
    return res.status(202).json({ status: 'accepted', result });
  } catch (err: any) {
    const requestId = (req as any).requestId || null;
    logger.error({ err, requestId }, 'requeueCampaignController error');
    return res.status(500).json({ error: ERRORS.INTERNAL_ERROR });
  }
}
