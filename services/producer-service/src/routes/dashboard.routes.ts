import express from 'express';
import { dashboardMetricsController } from '../controllers/dashboard.controller';

const router = express.Router();

// GET /v1/dashboard/metrics
router.get('/metrics', dashboardMetricsController);

export default router;
