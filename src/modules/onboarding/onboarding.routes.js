/**
 * Onboarding Routes
 * 
 * Workspace onboarding flow routes.
 */

import { Router } from 'express';
import {
  connectIntegrationHandler,
  createBookingTypeHandler,
  defineAvailabilityHandler,
  addInventoryHandler,
  addStaffHandler,
  validateHandler,
  activateHandler,
  statusHandler,
  getIntegrationsHandler,
} from './onboarding.controller.js';
import { requireAuth, authorizeRole } from '../../middleware/auth.js';

const router = Router();

// All onboarding routes require authentication and OWNER role
router.use(...requireAuth(), authorizeRole('OWNER'));

// Onboarding steps
router.post('/integration', connectIntegrationHandler);
router.get('/integration', getIntegrationsHandler);
router.post('/booking-type', createBookingTypeHandler);
router.post('/availability', defineAvailabilityHandler);
router.post('/inventory', addInventoryHandler);
router.post('/staff', addStaffHandler);

// Validation and activation
router.get('/validate', validateHandler);
router.post('/activate', activateHandler);

// Status
router.get('/status', statusHandler);

export { router as onboardingRoutes };
