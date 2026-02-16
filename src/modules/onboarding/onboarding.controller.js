/**
 * Onboarding Controller
 * 
 * Handles HTTP requests for onboarding endpoints.
 */

import {
  connectIntegration,
  createBookingType,
  defineAvailability,
  addInventory,
  addStaffUser,
  validateReadiness,
  activateWorkspace,
  getOnboardingStatus,
  getWorkspaceIntegrations,
  OnboardingValidationError,
} from './onboarding.service.js';
import { logger } from '../../lib/logger.js';

/**
 * Connect integration
 * POST /onboarding/integration
 */
export async function connectIntegrationHandler(req, res, next) {
  try {
    const { type, provider, config } = req.body;
    const { workspaceId } = req;

    if (!type || !provider || !config) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'type, provider, and config are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const integration = await connectIntegration({
      workspaceId,
      type,
      provider,
      config,
    });

    res.status(201).json({
      success: true,
      data: integration,
    });
  } catch (err) {
    logger.error({ err }, 'Connect integration failed');
    next(err);
  }
}

/**
 * Create booking type
 * POST /onboarding/booking-type
 */
export async function createBookingTypeHandler(req, res, next) {
  try {
    const { name, duration } = req.body;
    const { workspaceId } = req;

    if (!name || !duration) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'name and duration are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const bookingType = await createBookingType({
      workspaceId,
      name,
      duration: parseInt(duration, 10),
    });

    res.status(201).json({
      success: true,
      data: bookingType,
    });
  } catch (err) {
    logger.error({ err }, 'Create booking type failed');
    next(err);
  }
}

/**
 * Define availability
 * POST /onboarding/availability
 */
export async function defineAvailabilityHandler(req, res, next) {
  try {
    const { slots } = req.body;
    const { workspaceId } = req;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'slots array is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Validate slots
    for (const slot of slots) {
      if (
        typeof slot.dayOfWeek !== 'number' ||
        !slot.startTime ||
        !slot.endTime
      ) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Each slot must have dayOfWeek (0-6), startTime (HH:mm), and endTime (HH:mm)',
            code: 'VALIDATION_ERROR',
          },
        });
      }
    }

    const availability = await defineAvailability({
      workspaceId,
      slots,
    });

    res.status(201).json({
      success: true,
      data: availability,
    });
  } catch (err) {
    logger.error({ err }, 'Define availability failed');
    next(err);
  }
}

/**
 * Add inventory
 * POST /onboarding/inventory
 */
export async function addInventoryHandler(req, res, next) {
  try {
    const { name, quantity, threshold } = req.body;
    const { workspaceId } = req;

    if (!name || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'name and quantity are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const item = await addInventory({
      workspaceId,
      name,
      quantity: parseInt(quantity, 10),
      threshold: threshold !== undefined ? parseInt(threshold, 10) : undefined,
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (err) {
    logger.error({ err }, 'Add inventory failed');
    next(err);
  }
}

/**
 * Add staff user
 * POST /onboarding/staff
 */
export async function addStaffHandler(req, res, next) {
  try {
    const { email, name, password } = req.body;
    const { workspaceId } = req;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'email and name are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const result = await addStaffUser({
      workspaceId,
      email,
      name,
      password,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error({ err }, 'Add staff failed');
    
    if (err.message === 'User is already a member of this workspace') {
      return res.status(409).json({
        success: false,
        error: { message: err.message, code: 'ALREADY_MEMBER' },
      });
    }
    
    next(err);
  }
}

/**
 * Validate readiness
 * GET /onboarding/validate
 */
export async function validateHandler(req, res, next) {
  try {
    const { workspaceId } = req;

    const readiness = await validateReadiness(workspaceId);

    res.json({
      success: true,
      data: readiness,
    });
  } catch (err) {
    logger.error({ err }, 'Validate readiness failed');
    next(err);
  }
}

/**
 * Activate workspace
 * POST /onboarding/activate
 */
export async function activateHandler(req, res, next) {
  try {
    const { workspaceId } = req;

    const result = await activateWorkspace(workspaceId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error({ err }, 'Activate workspace failed');
    
    if (err instanceof OnboardingValidationError) {
      return res.status(400).json({
        success: false,
        error: {
          message: err.message,
          code: 'VALIDATION_FAILED',
          details: err.details,
        },
      });
    }
    
    next(err);
  }
}

/**
 * Get onboarding status
 * GET /onboarding/status
 */
export async function statusHandler(req, res, next) {
  try {
    const { workspaceId } = req;

    const status = await getOnboardingStatus(workspaceId);

    res.json({
      success: true,
      data: status,
    });
  } catch (err) {
    logger.error({ err }, 'Get onboarding status failed');
    next(err);
  }
}

/**
 * Get workspace integrations
 * GET /onboarding/integration
 */
export async function getIntegrationsHandler(req, res, next) {
  try {
    const { workspaceId } = req;

    const integrations = await getWorkspaceIntegrations(workspaceId);

    res.json({
      success: true,
      data: integrations,
    });
  } catch (err) {
    logger.error({ err }, 'Get integrations failed');
    next(err);
  }
}
