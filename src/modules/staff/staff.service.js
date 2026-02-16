/**
 * Staff Service
 * 
 * Handles staff management operations.
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

/**
 * Get all staff members for a workspace
 * @param {string} workspaceId
 * @returns {Promise<object[]>}
 */
export async function listStaff(workspaceId) {
  const staff = await prisma.workspaceUser.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Format response
  const formattedStaff = staff.map((member) => ({
    id: member.id,
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    createdAt: member.createdAt,
  }));

  logger.info({ workspaceId, count: formattedStaff.length }, 'Staff listed');

  return formattedStaff;
}
