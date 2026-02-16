/**
 * Staff Controller
 * 
 * Handles staff-related HTTP requests.
 */

import * as staffService from './staff.service.js';
import { logger } from '../../lib/logger.js';

/**
 * GET /api/v1/staff
 * List all staff members for the workspace
 */
export async function listStaff(req, res, next) {
  try {
    const { workspaceId } = req;

    const staff = await staffService.listStaff(workspaceId);

    res.json({
      success: true,
      data: staff,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list staff');
    next(err);
  }
}
