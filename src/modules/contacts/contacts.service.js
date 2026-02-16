/**
 * Contacts Service
 * 
 * Handles contact management operations.
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

/**
 * Get all contacts for a workspace
 * @param {string} workspaceId
 * @returns {Promise<object[]>}
 */
export async function listContacts(workspaceId) {
  const contacts = await prisma.contact.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info({ workspaceId, count: contacts.length }, 'Contacts listed');

  return contacts;
}

/**
 * Create a new contact
 * @param {string} workspaceId
 * @param {object} data
 * @param {string} data.name
 * @param {string} [data.email]
 * @param {string} [data.phone]
 * @returns {Promise<object>}
 */
export async function createContact(workspaceId, { name, email, phone }) {
  const contact = await prisma.contact.create({
    data: {
      name,
      email,
      phone,
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info({ workspaceId, contactId: contact.id }, 'Contact created');

  return contact;
}

/**
 * Get a single contact by ID
 * @param {string} workspaceId
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getContactById(workspaceId, id) {
  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId },
    include: {
      conversations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      bookings: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          bookingType: {
            select: { name: true },
          },
        },
      },
    },
  });

  return contact;
}
