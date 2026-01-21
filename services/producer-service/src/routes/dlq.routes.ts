import { Router } from 'express';
import {
  listDlqController,
  requeueDlqController,
  requeueDeliveryRowController,
  requeueCampaignController,
} from '../controllers/dlq.controller';

const router = Router();

router.get('/', listDlqController);
router.post('/:deliveryId/requeue', requeueDlqController);
router.post('/delivery-row/:deliveryId/requeue', requeueDeliveryRowController);
router.post('/campaign/:campaignId/requeue', requeueCampaignController);

export default router;
