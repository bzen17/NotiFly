import { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  listCampaigns,
  getCampaign,
  listDeliveriesForCampaign,
} from '../services/campaign.query.service';
import campaignRepository from '../repositories/campaign.repository';
import { getMongo } from '../config/db';
import { ERRORS } from '../constants';

/**
 * Query controllers for campaigns: list, get, and list deliveries.
 */
export async function listCampaignsController(req: Request, res: Response) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const { page: _p, limit: _l, ...queryFilter } = req.query || {};
    const filter: any = { ...(queryFilter as any) };
    // If requester is a tenant, scope campaigns to their tenantId
    const user = (req as any).user;
    if (user && user.role === 'tenant') {
      filter.tenantId = user.tenantId || user.id;
    }
    const data = await listCampaigns({ page, limit, filter });
    return res.json(data);
  } catch (err) {
    const requestId = (req as any).requestId || null;
    logger.error({ err, requestId }, 'listCampaignsController error');
    return res.status(500).json({ error: ERRORS.INTERNAL_ERROR });
  }
}

export async function getCampaignController(req: Request, res: Response) {
  try {
    const { campaignId } = req.params;
    const data = await getCampaign(campaignId);
    if (!data) return res.status(404).json({ error: ERRORS.NOT_FOUND });
    return res.json(data);
  } catch (err) {
    const requestId = (req as any).requestId || null;
    logger.error({ err, requestId }, 'getCampaignController error');
    return res.status(500).json({ error: ERRORS.INTERNAL_ERROR });
  }
}

export async function listCampaignDeliveriesController(req: Request, res: Response) {
  try {
    const { campaignId } = req.params;
    // If tenant, verify ownership of the campaign
    const user = (req as any).user;
    if (user && user.role === 'tenant') {
      const mongo = await getMongo();
      const doc = await campaignRepository.findById(mongo, campaignId).catch(() => null);
      if (!doc) return res.status(404).json({ error: ERRORS.NOT_FOUND });
      const t = doc.tenantId || doc.tenant_id || null;
      const tenantId = user.tenantId || user.id;
      if (!t || String(t) !== String(tenantId))
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const data = await listDeliveriesForCampaign(campaignId, { page, limit });
    return res.json(data);
  } catch (err) {
    const requestId = (req as any).requestId || null;
    logger.error({ err, requestId }, 'listCampaignDeliveriesController error');
    return res.status(500).json({ error: ERRORS.INTERNAL_ERROR });
  }
}

export default { listCampaignsController, getCampaignController, listCampaignDeliveriesController };
