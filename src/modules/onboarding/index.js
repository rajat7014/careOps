/**
 * Onboarding Module
 * 
 * Workspace onboarding flow module exports.
 */

// Routes
export { onboardingRoutes } from './onboarding.routes.js';

// Service functions
export {
  connectIntegration,
  createBookingType,
  defineAvailability,
  addInventory,
  addStaffUser,
  validateReadiness,
  activateWorkspace,
  getOnboardingStatus,
  OnboardingValidationError,
} from './onboarding.service.js';

// Controller functions
export {
  connectIntegrationHandler,
  createBookingTypeHandler,
  defineAvailabilityHandler,
  addInventoryHandler,
  addStaffHandler,
  validateHandler,
  activateHandler,
  statusHandler,
} from './onboarding.controller.js';
