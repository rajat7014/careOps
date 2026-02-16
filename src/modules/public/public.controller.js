/**
 * Public Controller
 * 
 * Handles public customer-facing HTTP requests
 * No authentication required - workspace identified by slug
 */

import * as publicService from './public.service.js';
import { logger } from '../../lib/logger.js';

/**
 * POST /public/contact
 * Create a new contact (Contact-First Flow)
 */
export async function createContact(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const { name, email, phone, message } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name is required', code: 'VALIDATION_ERROR' },
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Either email or phone is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const result = await publicService.createContact(workspaceId, {
      name,
      email,
      phone,
      message,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create public contact');
    next(err);
  }
}

/**
 * GET /public/booking/:slug
 * Get workspace public booking information
 */
export async function getWorkspaceInfo(req, res, next) {
  try {
    const { slug } = req.params;

    const workspace = await publicService.getWorkspacePublicInfo(slug);

    res.json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    if (err.message === 'Workspace not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Workspace not found', code: 'NOT_FOUND' },
      });
    }
    if (err.message === 'Workspace is not active') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'This workspace is not accepting bookings yet',
          code: 'WORKSPACE_INACTIVE',
        },
      });
    }
    logger.error({ err }, 'Failed to get workspace public info');
    next(err);
  }
}

/**
 * POST /public/booking
 * Create a booking from public form (Booking-First Flow)
 */
export async function createBooking(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const {
      name,
      email,
      phone,
      bookingTypeId,
      scheduledAt,
      notes,
      inventoryItems,
    } = req.body;

    // Validation
    if (!name || !bookingTypeId || !scheduledAt) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name, bookingTypeId, and scheduledAt are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Either email or phone is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const result = await publicService.createPublicBooking(workspaceId, {
      name,
      email,
      phone,
      bookingTypeId,
      scheduledAt,
      notes,
      inventoryItems,
    });

    res.status(201).json({
      success: true,
      data: {
        booking: result.booking,
        contact: result.contact,
        conversationId: result.conversationId,
        inventoryUsages: result.inventoryUsages,
      },
    });
  } catch (err) {
    if (err.message === 'Workspace is not active') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'This workspace is not accepting bookings yet',
          code: 'WORKSPACE_INACTIVE',
        },
      });
    }
    if (err.message?.includes('Insufficient inventory')) {
      return res.status(400).json({
        success: false,
        error: {
          message: err.message,
          code: 'INSUFFICIENT_INVENTORY',
        },
      });
    }
    logger.error({ err }, 'Failed to create public booking');
    next(err);
  }
}
