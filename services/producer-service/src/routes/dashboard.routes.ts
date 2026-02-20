import express from 'express';
import { dashboardMetricsController } from '../controllers/dashboard.controller';

const router = express.Router();

router.get('/metrics', dashboardMetricsController);

export default router;
