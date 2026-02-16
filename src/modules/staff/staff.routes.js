/**
 * Staff Routes
 * 
 * Staff management endpoints.
 */

import { Router } from 'express';
import * as staffController from './staff.controller.js';
import { requireAuth, authorizeRole } from '../../middleware/auth.js';

const router = Router();

// All staff routes require authentication and OWNER role
router.use(...requireAuth(), authorizeRole('OWNER'));

/**
 * @route   GET /api/v1/staff
 * @desc    List all staff members for the workspace
 * @access  Private (OWNER only)
 */
router.get('/', staffController.listStaff);

export default router;
