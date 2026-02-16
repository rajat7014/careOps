/**
 * Contacts Routes
 * 
 * Contact management endpoints.
 */

import { Router } from 'express';
import * as contactsController from './contacts.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// All contacts routes require authentication
router.use(...requireAuth());

/**
 * @route   GET /api/v1/contacts
 * @desc    List all contacts for the workspace
 * @access  Private
 */
router.get('/', contactsController.listContacts);

/**
 * @route   POST /api/v1/contacts
 * @desc    Create a new contact
 * @access  Private
 */
router.post('/', contactsController.createContact);

/**
 * @route   GET /api/v1/contacts/:id
 * @desc    Get a single contact by ID
 * @access  Private
 */
router.get('/:id', contactsController.getContact);

export default router;
