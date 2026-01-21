import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createCampaignController } from '../controllers/campaigns.command.controller';
import {
  listCampaignsController,
  getCampaignController,
  listCampaignDeliveriesController,
} from '../controllers/campaigns.query.controller';

const router = Router();

// Commands
router.post('/', authMiddleware, createCampaignController);

// Queries
router.get('/', listCampaignsController);
router.get('/:campaignId', getCampaignController);
router.get('/:campaignId/deliveries', listCampaignDeliveriesController);

export default router;
