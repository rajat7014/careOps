/**
 * Public Routes
 * 
 * Customer-facing endpoints - NO AUTHENTICATION REQUIRED
 * These endpoints are accessed by customers, not staff
 */

import { Router } from 'express';
import * as publicController from './public.controller.js';
import { requireActiveWorkspace } from '../../middleware/workspaceActivation.js';

const router = Router();

/**
 * @route   GET /api/v1/public/booking/:slug
 * @desc    Get workspace public booking info (availability, booking types)
 * @access  Public
 */
router.get('/booking/:slug', publicController.getWorkspaceInfo);

/**
 * @route   POST /api/v1/public/:workspaceId/contact
 * @desc    Create a contact (Contact-First Flow)
 * @access  Public - requires active workspace
 */
router.post(
  '/:workspaceId/contact',
  requireActiveWorkspace(),
  publicController.createContact
);

/**
 * @route   POST /api/v1/public/:workspaceId/booking
 * @desc    Create a booking (Booking-First Flow)
 * @access  Public - requires active workspace
 */
router.post(
  '/:workspaceId/booking',
  requireActiveWorkspace(),
  publicController.createBooking
);

export default router;
