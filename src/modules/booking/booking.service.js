import { prisma } from '../../lib/prisma.js';
import { emit, Events } from '../../lib/events/eventBus.js';
import {
  scheduleBookingConfirmation,
  scheduleBookingReminder,
  scheduleFormSubmissionCreation,
} from '../../lib/queue/automationQueue.js';

// Business logic will be implemented here. Stubs only.

/**
 * List all bookings for a workspace
 * @param {string} workspaceId
 * @param {object} _query - Query parameters (pagination, filters)
 */
export async function list(workspaceId, _query) {
  const list = await prisma.booking.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      contact: true,
      bookingType: true,
    },
  });
  return list;
}

/**
 * Get a single booking by ID
 * @param {string} workspaceId
 * @param {string} id
 */
export async function getById(workspaceId, id) {
  return prisma.booking.findFirst({
    where: { id, workspaceId },
    include: {
      contact: true,
      bookingType: true,
      formSubmissions: true,
    },
  });
}

/**
 * Create a new booking and trigger automation
 * @param {string} workspaceId
 * @param {object} body - Booking data
 * @param {string} body.contactId
 * @param {string} body.bookingTypeId
 * @param {Date} body.scheduledAt
 */
export async function create(workspaceId, body) {
  const { contactId, bookingTypeId, scheduledAt, ...data } = body;

  // Create booking with related data
  const booking = await prisma.booking.create({
    data: {
      workspaceId,
      contactId,
      bookingTypeId,
      scheduledAt: new Date(scheduledAt),
      ...data,
    },
    include: {
      contact: true,
      bookingType: {
        include: { forms: true },
      },
    },
  });

  // Prepare automation data
  const automationData = {
    workspaceId,
    bookingId: booking.id,
    contactId: booking.contactId,
    booking,
  };

  // Emit domain event
  emit(Events.BOOKING_CREATED, automationData);

  // Trigger automation jobs
  await Promise.all([
    // Send confirmation immediately
    scheduleBookingConfirmation(automationData),

    // Schedule reminder (24 hours before)
    scheduleBookingReminder(automationData, booking.scheduledAt, 24),

    // Create form submissions for associated forms
    scheduleFormSubmissionCreation({
      workspaceId,
      bookingId: booking.id,
      formId: booking.bookingType?.forms?.[0]?.id,
    }),
  ]);

  return booking;
}

/**
 * Update a booking
 * @param {string} workspaceId
 * @param {string} id
 * @param {object} body
 */
export async function update(workspaceId, id, body) {
  const existing = await prisma.booking.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) return null;

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...body,
      updatedAt: new Date(),
    },
    include: {
      contact: true,
      bookingType: true,
    },
  });

  emit(Events.BOOKING_UPDATED, {
    workspaceId,
    bookingId: id,
    booking: updated,
  });

  return updated;
}

/**
 * Delete a booking
 * @param {string} workspaceId
 * @param {string} id
 */
export async function remove(workspaceId, id) {
  const booking = await prisma.booking.findFirst({
    where: { id, workspaceId },
  });
  if (!booking) return null;

  await prisma.booking.delete({ where: { id } });

  emit(Events.BOOKING_DELETED, { workspaceId, bookingId: id });

  return true;
}
