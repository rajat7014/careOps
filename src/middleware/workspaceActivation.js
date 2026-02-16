/**
 * Workspace Activation Middleware
 * 
 * Ensures public endpoints are only accessible when workspace is active
 * and meets all activation requirements
 */

import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

/**
 * Middleware to check if workspace is active before allowing public access
 * Use on public customer-facing routes
 */
export function requireActiveWorkspace() {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Workspace ID is required',
            code: 'WORKSPACE_ID_MISSING',
          },
        });
      }

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          integrations: { where: { isActive: true } },
          bookingTypes: true,
          availability: true,
        },
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Workspace not found',
            code: 'WORKSPACE_NOT_FOUND',
          },
        });
      }

      // Check if workspace is active
      if (!workspace.isActive) {
        // Check why it's not active for better error message
        const errors = [];

        const hasEmail = workspace.integrations.some((i) => i.type === 'EMAIL');
        const hasSMS = workspace.integrations.some((i) => i.type === 'SMS');

        if (!hasEmail && !hasSMS) {
          errors.push('Communication channel (Email or SMS) not configured');
        }

        if (workspace.bookingTypes.length === 0) {
          errors.push('No booking types defined');
        }

        if (workspace.availability.length === 0) {
          errors.push('Availability schedule not defined');
        }

        return res.status(403).json({
          success: false,
          error: {
            message: 'Workspace is not active',
            code: 'WORKSPACE_INACTIVE',
            details: {
              isActive: false,
              errors,
              requirements: {
                communicationChannel: hasEmail || hasSMS,
                bookingTypes: workspace.bookingTypes.length > 0,
                availability: workspace.availability.length > 0,
              },
            },
          },
        });
      }

      // Attach workspace to request for downstream use
      req.workspace = workspace;
      next();
    } catch (err) {
      logger.error({ err }, 'Error checking workspace activation');
      next(err);
    }
  };
}
