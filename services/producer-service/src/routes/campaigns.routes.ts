import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createCampaignController } from '../controllers/campaigns.command.controller';
import {
  listCampaignsController,
  getCampaignController,
  listCampaignDeliveriesController,
} from '../controllers/campaigns.query.controller';

const router = Router();

router.post('/', authMiddleware, createCampaignController);

router.get('/', listCampaignsController);
router.get('/:campaignId', getCampaignController);
router.get('/:campaignId/deliveries', listCampaignDeliveriesController);

export default router;
