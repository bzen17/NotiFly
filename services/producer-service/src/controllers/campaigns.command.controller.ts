import { Request, Response } from 'express';
import logger from '../utils/logger';
import { createCampaign } from '../services/campaign.command.service';
import { ERRORS } from '../constants';

/**
 * Controller to create a campaign. Validates input via service and returns
 * a 202 accepted with the generated campaign id on success.
 */

export async function createCampaignController(req: Request, res: Response) {
  logger.info(
    { user: (req as any).user?.id || null, bodyKeys: Object.keys(req.body || {}) },
    'createCampaignController',
  );
  try {
    // Ensure tenantId is present for demo/admin requests: prefer explicit body value,
    // otherwise derive from authenticated user attached by auth middleware.
    const body = { ...(req.body || {}) };
    const user = (req as any).user;
    if (!body.tenantId && user) {
      body.tenantId = user.tenantId || user.id;
    }

    const result = await createCampaign(body);
    return res.status(202).json({ campaignId: result.campaignId });
  } catch (err: any) {
    const requestId = (req as any).requestId || null;
    logger.error({ err, requestId }, 'Error in createCampaignController');
    if (err && err.message === ERRORS.VALIDATION_ERROR) {
      return res.status(400).json({ error: ERRORS.VALIDATION_ERROR, details: err.details });
    }
    return res.status(500).json({ error: ERRORS.INTERNAL_ERROR });
  }
}
