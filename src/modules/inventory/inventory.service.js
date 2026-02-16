/**
 * Inventory Service
 * 
 * Handles inventory management operations.
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

/**
 * Get all inventory items for a workspace
 * @param {string} workspaceId
 * @returns {Promise<object[]>}
 */
export async function listInventory(workspaceId) {
  const items = await prisma.inventoryItem.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      quantity: true,
      threshold: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info({ workspaceId, count: items.length }, 'Inventory listed');

  return items;
}

/**
 * Get low stock items for a workspace
 * @param {string} workspaceId
 * @returns {Promise<object[]>}
 */
export async function getLowStockItems(workspaceId) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      workspaceId,
      quantity: {
        lte: prisma.inventoryItem.fields.threshold,
      },
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      threshold: true,
    },
  });

  return items;
}

/**
 * Get a single inventory item by ID
 * @param {string} workspaceId
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getInventoryItemById(workspaceId, id) {
  const item = await prisma.inventoryItem.findFirst({
    where: { id, workspaceId },
    include: {
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  return item;
}
