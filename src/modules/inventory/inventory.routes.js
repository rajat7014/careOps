/**
 * Inventory Routes
 * 
 * Inventory management endpoints.
 */

import { Router } from 'express';
import * as inventoryController from './inventory.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// All inventory routes require authentication
router.use(...requireAuth());

/**
 * @route   GET /api/v1/inventory
 * @desc    List all inventory items for the workspace
 * @access  Private
 */
router.get('/', inventoryController.listInventory);

/**
 * @route   GET /api/v1/inventory/low-stock
 * @desc    Get items with low stock
 * @access  Private
 */
router.get('/low-stock', inventoryController.getLowStock);

/**
 * @route   GET /api/v1/inventory/:id
 * @desc    Get a single inventory item by ID
 * @access  Private
 */
router.get('/:id', inventoryController.getInventoryItem);

export default router;
