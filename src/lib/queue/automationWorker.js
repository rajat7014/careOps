/**
 * Automation Worker
 * 
 * BullMQ worker for processing automation jobs.
 * Handles job processing logic separate from queue management.
 */

import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import { emit } from '../events/eventBus.js';
import { Events, AutomationJobs } from '../events/registry.js';

/**
 * Send booking confirmation
 * @param {object} job - BullMQ job
 * @param {object} job.data
 */
async function sendBookingConfirmation(job) {
  const { bookingId, workspaceId, contactId, booking } = job.data;

  logger.info(
    { bookingId, workspaceId, jobId: job.id },
    'Processing booking confirmation'
  );

  // TODO: Integrate with email/SMS service
  // For now, emit event for any listeners
  emit(Events.SEND_CONFIRMATION, {
    workspaceId,
    bookingId,
    contactId,
    channel: 'email',
    type: 'booking_confirmation',
  });

  // Example: Create notification record
  // await prisma.notification.create({...});
}

/**
 * Send booking reminder
 * @param {object} job - BullMQ job
 * @param {object} job.data
 */
async function sendBookingReminder(job) {
  const { bookingId, workspaceId, contactId, booking, reminderHoursBefore } = job.data;

  logger.info(
    { bookingId, workspaceId, reminderHoursBefore, jobId: job.id },
    'Processing booking reminder'
  );

  // Check if booking is still confirmed
  const currentBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, scheduledAt: true },
  });

  if (!currentBooking) {
    logger.warn({ bookingId }, 'Booking not found, skipping reminder');
    return;
  }

  if (currentBooking.status === 'CANCELLED') {
    logger.debug({ bookingId }, 'Booking cancelled, skipping reminder');
    return;
  }

  // TODO: Integrate with email/SMS service
  emit(Events.SEND_REMINDER, {
    workspaceId,
    bookingId,
    contactId,
    channel: 'email',
    type: 'booking_reminder',
    scheduledAt: currentBooking.scheduledAt,
  });
}

/**
 * Create form submission record
 * @param {object} job - BullMQ job
 * @param {object} job.data
 */
async function createFormSubmission(job) {
  const { bookingId, workspaceId, formId } = job.data;

  logger.info(
    { bookingId, workspaceId, formId, jobId: job.id },
    'Creating form submission'
  );

  try {
    // Check if form exists for this booking type
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingType: { include: { forms: true } } },
    });

    if (!booking) {
      logger.warn({ bookingId }, 'Booking not found, skipping form submission');
      return;
    }

    // Get forms associated with this booking type
    const forms = booking.bookingType?.forms || [];

    for (const form of forms) {
      const submission = await prisma.formSubmission.create({
        data: {
          bookingId,
          formId: form.id,
          status: 'PENDING',
        },
      });

      logger.debug(
        { submissionId: submission.id, bookingId, formId: form.id },
        'Form submission created'
      );

      // Emit event for form pending
      emit(Events.FORM_PENDING, {
        workspaceId,
        formSubmissionId: submission.id,
        bookingId,
        formId: form.id,
        contactId: booking.contactId,
      });
    }
  } catch (err) {
    logger.error({ err, bookingId, formId }, 'Failed to create form submission');
    throw err;
  }
}

/**
 * Check for overdue forms
 * @param {object} job - BullMQ job
 * @param {object} job.data
 */
async function checkFormOverdue(job) {
  const { formSubmissionId, workspaceId } = job.data;

  logger.info(
    { formSubmissionId, workspaceId, jobId: job.id },
    'Checking form overdue status'
  );

  const submission = await prisma.formSubmission.findUnique({
    where: { id: formSubmissionId },
  });

  if (!submission) {
    logger.warn({ formSubmissionId }, 'Form submission not found');
    return;
  }

  if (submission.status === 'PENDING') {
    // Mark as overdue
    await prisma.formSubmission.update({
      where: { id: formSubmissionId },
      data: { status: 'OVERDUE' },
    });

    emit(Events.FORM_OVERDUE, {
      workspaceId,
      formSubmissionId,
      bookingId: submission.bookingId,
      formId: submission.formId,
    });

    logger.debug({ formSubmissionId }, 'Form marked as overdue');
  }
}

/**
 * Send inventory alert
 * @param {object} job - BullMQ job
 * @param {object} job.data
 */
async function sendInventoryAlert(job) {
  const { workspaceId, itemId, item, quantity, threshold } = job.data;

  logger.info(
    { workspaceId, itemId, quantity, threshold, jobId: job.id },
    'Processing inventory alert'
  );

  // Create alert record
  await prisma.alert.create({
    data: {
      workspaceId,
      type: 'INVENTORY_LOW',
      message: `Inventory item "${item.name}" is low: ${quantity} remaining (threshold: ${threshold})`,
      status: 'ACTIVE',
    },
  });

  // TODO: Send notification to staff
}

/**
 * Send form reminder
 * @param {object} job - BullMQ job
 * @param {object} job.data
 */
async function sendFormReminder(job) {
  const { workspaceId, formSubmissionId, bookingId, formId, contactId } = job.data;

  logger.info(
    { formSubmissionId, workspaceId, jobId: job.id },
    'Processing form reminder'
  );

  // Check if form is still pending
  const submission = await prisma.formSubmission.findUnique({
    where: { id: formSubmissionId },
    include: {
      form: true,
      booking: {
        include: { contact: true },
      },
    },
  });

  if (!submission) {
    logger.warn({ formSubmissionId }, 'Form submission not found, skipping reminder');
    return;
  }

  if (submission.status !== 'PENDING') {
    logger.debug(
      { formSubmissionId, status: submission.status },
      'Form not pending, skipping reminder'
    );
    return;
  }

  // Emit event for sending reminder
  emit(Events.SEND_FORM_REMINDER, {
    workspaceId,
    formSubmissionId,
    bookingId,
    formId,
    contactId,
    form: submission.form,
    contact: submission.booking.contact,
  });
}

/**
 * Map of job processors
 */
export const automationProcessors = {
  [AutomationJobs.SEND_BOOKING_CONFIRMATION]: sendBookingConfirmation,
  [AutomationJobs.SEND_BOOKING_REMINDER]: sendBookingReminder,
  [AutomationJobs.CREATE_FORM_SUBMISSION]: createFormSubmission,
  [AutomationJobs.CHECK_FORM_OVERDUE]: checkFormOverdue,
  [AutomationJobs.SEND_INVENTORY_ALERT]: sendInventoryAlert,
  [AutomationJobs.SEND_FORM_REMINDER]: sendFormReminder,
};

/**
 * Get all automation processors
 * @returns {Record<string, (job: Job) => Promise<void>>}
 */
export function getAutomationProcessors() {
  return automationProcessors;
}
