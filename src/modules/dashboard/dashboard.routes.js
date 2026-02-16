import { Router } from 'express';
import { getStats, getRecent } from './dashboard.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(...requireAuth());

router.get('/stats', getStats);
router.get('/recent', getRecent);

export { router as dashboardRoutes };
