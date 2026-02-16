/**
 * Contacts Controller
 * 
 * Handles contact-related HTTP requests.
 */

import * as contactsService from './contacts.service.js';
import { logger } from '../../lib/logger.js';

/**
 * GET /api/v1/contacts
 * List all contacts for the workspace
 */
export async function listContacts(req, res, next) {
  try {
    const { workspaceId } = req;

    const contacts = await contactsService.listContacts(workspaceId);

    res.json({
      success: true,
      data: contacts,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list contacts');
    next(err);
  }
}

/**
 * POST /api/v1/contacts
 * Create a new contact
 */
export async function createContact(req, res, next) {
  try {
    const { workspaceId } = req;
    const { name, email, phone } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name is required', code: 'NAME_REQUIRED' },
      });
    }

    const contact = await contactsService.createContact(workspaceId, {
      name,
      email,
      phone,
    });

    res.status(201).json({
      success: true,
      data: contact,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create contact');
    next(err);
  }
}

/**
 * GET /api/v1/contacts/:id
 * Get a single contact by ID
 */
export async function getContact(req, res, next) {
  try {
    const { workspaceId } = req;
    const { id } = req.params;

    const contact = await contactsService.getContactById(workspaceId, id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contact not found', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get contact');
    next(err);
  }
}
