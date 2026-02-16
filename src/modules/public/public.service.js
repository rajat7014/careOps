/**
 * Public Service
 * 
 * Handles customer-facing operations without authentication:
 * - Contact creation
 * - Public booking with auto-contact creation
 * - Inventory deduction
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { emit, Events } from '../../lib/events/eventBus.js';
import {
  scheduleBookingConfirmation,
  scheduleBookingReminder,
  scheduleFormSubmissionCreation,
} from '../../lib/queue/automationQueue.js';

/**
 * Create a new contact and start conversation (Contact-First Flow)
 * @param {string} workspaceId
 * @param {object} data
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.phone
 * @param {string} [data.message] - Initial message
 */
export async function createContact(workspaceId, data) {
  const { name, email, phone, message } = data;

  const result = await prisma.$transaction(async (tx) => {
    // Create contact
    const contact = await tx.contact.create({
      data: {
        workspaceId,
        name,
        email,
        phone,
      },
    });

    // Create or get conversation
    let conversation = await tx.conversation.findFirst({
      where: { workspaceId, contactId: contact.id },
    });

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          workspaceId,
          contactId: contact.id,
        },
      });
    }

    // Add initial message if provided
    if (message) {
      await tx.message.create({
        data: {
          conversationId: conversation.id,
          channel: email ? 'EMAIL' : 'SMS',
          sender: 'CONTACT',
          content: message,
        },
      });
    }

    return { contact, conversation };
  });

  // Emit event for welcome message automation
  emit(Events.CONTACT_CREATED, {
    workspaceId,
    contactId: result.contact.id,
    contact: result.contact,
    conversationId: result.conversation.id,
  });

  logger.info(
    { workspaceId, contactId: result.contact.id },
    'Public contact created'
  );

  return {
    contact: result.contact,
    conversationId: result.conversation.id,
  };
}

/**
 * Get workspace public booking info by slug
 * @param {string} slug - Workspace slug
 */
export async function getWorkspacePublicInfo(slug) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      isActive: true,
      bookingTypes: {
        select: {
          id: true,
          name: true,
          duration: true,
        },
      },
      availability: {
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  if (!workspace.isActive) {
    throw new Error('Workspace is not active');
  }

  return workspace;
}

/**
 * Create a booking from public form (Booking-First Flow)
 * Auto-creates contact if not exists, deducts inventory
 * @param {string} workspaceId
 * @param {object} data
 */
export async function createPublicBooking(workspaceId, data) {
  const {
    name,
    email,
    phone,
    bookingTypeId,
    scheduledAt,
    notes,
    inventoryItems, // Array of { itemId, quantity }
  } = data;

  const result = await prisma.$transaction(async (tx) => {
    // Check workspace is active
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { isActive: true },
    });

    if (!workspace?.isActive) {
      throw new Error('Workspace is not active');
    }

    // Find or create contact
    let contact = await tx.contact.findFirst({
      where: {
        workspaceId,
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ],
      },
    });

    if (!contact) {
      contact = await tx.contact.create({
        data: {
          workspaceId,
          name,
          email,
          phone,
        },
      });

      // Emit contact created event
      emit(Events.CONTACT_CREATED, {
        workspaceId,
        contactId: contact.id,
        contact,
      });
    }

    // Get or create conversation
    let conversation = await tx.conversation.findFirst({
      where: { workspaceId, contactId: contact.id },
    });

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          workspaceId,
          contactId: contact.id,
        },
      });
    }

    // Check and deduct inventory if specified
    const inventoryUsages = [];
    if (inventoryItems && inventoryItems.length > 0) {
      for (const { itemId, quantity } of inventoryItems) {
        const item = await tx.inventoryItem.findFirst({
          where: { id: itemId, workspaceId },
        });

        if (!item) {
          throw new Error(`Inventory item ${itemId} not found`);
        }

        if (item.quantity < quantity) {
          throw new Error(
            `Insufficient inventory for "${item.name}". Available: ${item.quantity}, Required: ${quantity}`
          );
        }

        // Deduct inventory
        const updatedItem = await tx.inventoryItem.update({
          where: { id: itemId },
          data: { quantity: item.quantity - quantity },
        });

        // Log inventory change
        await tx.inventoryLog.create({
          data: {
            itemId,
            workspaceId,
            change: -quantity,
            reason: 'booking_created',
          },
        });

        inventoryUsages.push({
          itemId,
          quantity,
          itemName: item.name,
          remaining: updatedItem.quantity,
          threshold: updatedItem.threshold,
        });

        // Check if inventory is now low
        if (updatedItem.quantity <= updatedItem.threshold) {
          emit(Events.INVENTORY_LOW, {
            workspaceId,
            itemId,
            item: updatedItem,
            quantity: updatedItem.quantity,
            threshold: updatedItem.threshold,
          });
        }
      }
    }

    // Create booking
    const booking = await tx.booking.create({
      data: {
        workspaceId,
        contactId: contact.id,
        bookingTypeId,
        scheduledAt: new Date(scheduledAt),
        status: 'CONFIRMED',
      },
      include: {
        contact: true,
        bookingType: {
          include: { forms: true },
        },
      },
    });

    // Create booking inventory records
    for (const usage of inventoryUsages) {
      await tx.bookingInventory.create({
        data: {
          bookingId: booking.id,
          itemId: usage.itemId,
          quantity: usage.quantity,
        },
      });
    }

    return { booking, contact, conversation, inventoryUsages };
  });

  // Prepare automation data
  const automationData = {
    workspaceId,
    bookingId: result.booking.id,
    contactId: result.contact.id,
    conversationId: result.conversation.id,
    booking: result.booking,
  };

  // Emit booking created event
  emit(Events.BOOKING_CREATED, automationData);

  // Schedule automation jobs
  await Promise.all([
    // Send confirmation immediately
    scheduleBookingConfirmation(automationData),

    // Schedule reminder (24 hours before)
    scheduleBookingReminder(automationData, result.booking.scheduledAt, 24),

    // Create form submissions for associated forms
    scheduleFormSubmissionCreation({
      workspaceId,
      bookingId: result.booking.id,
      formId: result.booking.bookingType?.forms?.[0]?.id,
    }),
  ]);

  logger.info(
    {
      workspaceId,
      bookingId: result.booking.id,
      contactId: result.contact.id,
      inventoryUsages: result.inventoryUsages,
    },
    'Public booking created'
  );

  return {
    booking: result.booking,
    contact: result.contact,
    conversationId: result.conversation.id,
    inventoryUsages: result.inventoryUsages,
  };
}
