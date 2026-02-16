/**
 * Inventory Controller
 * 
 * Handles inventory-related HTTP requests.
 */

import * as inventoryService from './inventory.service.js';
import { logger } from '../../lib/logger.js';

/**
 * GET /api/v1/inventory
 * List all inventory items for the workspace
 */
export async function listInventory(req, res, next) {
  try {
    const { workspaceId } = req;

    const items = await inventoryService.listInventory(workspaceId);

    res.json({
      success: true,
      data: items,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list inventory');
    next(err);
  }
}

/**
 * GET /api/v1/inventory/low-stock
 * Get items with low stock
 */
export async function getLowStock(req, res, next) {
  try {
    const { workspaceId } = req;

    const items = await inventoryService.getLowStockItems(workspaceId);

    res.json({
      success: true,
      data: items,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get low stock items');
    next(err);
  }
}

/**
 * GET /api/v1/inventory/:id
 * Get a single inventory item by ID
 */
export async function getInventoryItem(req, res, next) {
  try {
    const { workspaceId } = req;
    const { id } = req.params;

    const item = await inventoryService.getInventoryItemById(workspaceId, id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { message: 'Inventory item not found', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get inventory item');
    next(err);
  }
}
