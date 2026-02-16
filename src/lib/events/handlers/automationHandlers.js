/**
 * Automation Event Handlers
 * 
 * Complete event-driven automation handlers:
 * - CONTACT_CREATED → welcome message
 * - BOOKING_CREATED → confirmation + reminder + forms
 * - INVENTORY_LOW → owner alert
 * - FORM_PENDING → reminder
 * - FORM_OVERDUE → escalation
 */

import { on, Events } from '../eventBus.js';
import { logger } from '../../logger.js';
import { prisma } from '../../prisma.js';
import {
  sendWelcomeMessage,
  sendBookingConfirmation,
  sendBookingReminder,
  sendFormReminder,
} from '../../../integrations/integration.service.js';
import {
  scheduleFormReminder,
  scheduleFormOverdueCheck,
} from '../../queue/automationQueue.js';

/**
 * Initialize contact event handlers
 */
export function initializeContactHandlers() {
  // CONTACT_CREATED → Send welcome message
  on(Events.CONTACT_CREATED, async (payload) => {
    const { workspaceId, contactId, contact } = payload;

    logger.info(
      { workspaceId, contactId },
      'Contact created - sending welcome message'
    );

    try {
      // Idempotency check: Only send welcome if contact was created recently
      const contactRecord = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { createdAt: true, email: true, phone: true, name: true },
      });

      if (!contactRecord) {
        logger.warn({ contactId }, 'Contact not found for welcome message');
        return;
      }

      // Check if welcome was already sent (within last 5 minutes to prevent duplicates)
      const recentLog = await prisma.integrationLog.findFirst({
        where: {
          workspaceId,
          to: contactRecord.email || contactRecord.phone,
          content: { contains: 'Welcome' },
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      });

      if (recentLog) {
        logger.info(
          { contactId },
          'Welcome message already sent recently, skipping'
        );
        return;
      }

      // Send welcome message via configured integrations
      const results = await sendWelcomeMessage(workspaceId, contactRecord);

      logger.info(
        { workspaceId, contactId, results },
        'Welcome message sent'
      );
    } catch (error) {
      logger.error(
        { error, workspaceId, contactId },
        'Failed to send welcome message'
      );
      // Don't throw - automation should not break core flow
    }
  });

  logger.info('Contact event handlers registered');
}

/**
 * Initialize booking event handlers
 */
export function initializeBookingAutomationHandlers() {
  // BOOKING_CREATED → Send confirmation + schedule reminder
  on(Events.BOOKING_CREATED, async (payload) => {
    const { workspaceId, bookingId, contactId, conversationId } = payload;

    logger.info(
      { workspaceId, bookingId, contactId },
      'Booking created - sending confirmation'
    );

    try {
      // Fetch booking with contact info
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          contact: true,
          bookingType: true,
        },
      });

      if (!booking) {
        logger.warn({ bookingId }, 'Booking not found for confirmation');
        return;
      }

      // Idempotency check: Only send if not already sent
      const recentConfirmation = await prisma.integrationLog.findFirst({
        where: {
          workspaceId,
          to: booking.contact.email || booking.contact.phone,
          content: { contains: 'confirmed' },
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      });

      if (recentConfirmation) {
        logger.info(
          { bookingId },
          'Confirmation already sent recently, skipping'
        );
        return;
      }

      // Send booking confirmation
      await sendBookingConfirmation(workspaceId, booking, booking.contact);

      logger.info(
        { workspaceId, bookingId },
        'Booking confirmation sent'
      );
    } catch (error) {
      logger.error(
        { error, workspaceId, bookingId },
        'Failed to send booking confirmation'
      );
    }
  });

  // SEND_CONFIRMATION event (triggered by automation worker)
  on(Events.SEND_CONFIRMATION, async (payload) => {
    const { workspaceId, bookingId, contactId } = payload;

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { contact: true, bookingType: true },
      });

      if (!booking) return;

      await sendBookingConfirmation(workspaceId, booking, booking.contact);
    } catch (error) {
      logger.error({ error, bookingId }, 'Failed to process SEND_CONFIRMATION');
    }
  });

  // SEND_REMINDER event (triggered by automation worker)
  on(Events.SEND_REMINDER, async (payload) => {
    const { workspaceId, bookingId, contactId } = payload;

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { contact: true, bookingType: true },
      });

      if (!booking) return;

      // Only send if booking is still confirmed
      if (booking.status !== 'CONFIRMED') {
        logger.info({ bookingId, status: booking.status }, 'Skipping reminder - booking not confirmed');
        return;
      }

      await sendBookingReminder(workspaceId, booking, booking.contact);
    } catch (error) {
      logger.error({ error, bookingId }, 'Failed to process SEND_REMINDER');
    }
  });

  logger.info('Booking automation handlers registered');
}

/**
 * Initialize inventory event handlers
 */
export function initializeInventoryHandlers() {
  // INVENTORY_LOW → Create alert and notify owner
  on(Events.INVENTORY_LOW, async (payload) => {
    const { workspaceId, itemId, item, quantity, threshold } = payload;

    logger.info(
      { workspaceId, itemId, quantity, threshold },
      'Inventory low - creating alert'
    );

    try {
      // Idempotency: Check if alert already exists for this item
      const existingAlert = await prisma.alert.findFirst({
        where: {
          workspaceId,
          type: 'INVENTORY_LOW',
          message: { contains: item.name },
          status: 'ACTIVE',
        },
      });

      if (existingAlert) {
        logger.info(
          { itemId },
          'Active inventory alert already exists, skipping'
        );
        return;
      }

      // Create alert record
      const alert = await prisma.alert.create({
        data: {
          workspaceId,
          type: 'INVENTORY_LOW',
          message: `Inventory item "${item.name}" is low: ${quantity} remaining (threshold: ${threshold})`,
          status: 'ACTIVE',
        },
      });

      // Get owner email for notification
      const owner = await prisma.workspaceUser.findFirst({
        where: {
          workspaceId,
          role: 'OWNER',
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      });

      if (owner?.user?.email) {
        const { sendMessage } = await import('../../../integrations/integration.service.js');
        await sendMessage({
          workspaceId,
          type: 'EMAIL',
          to: owner.user.email,
          subject: 'Inventory Alert',
          content: `Alert: ${item.name} is running low. Current quantity: ${quantity} (threshold: ${threshold}).`,
        });
      }

      logger.info(
        { workspaceId, itemId, alertId: alert.id },
        'Inventory alert created and owner notified'
      );
    } catch (error) {
      logger.error(
        { error, workspaceId, itemId },
        'Failed to create inventory alert'
      );
    }
  });

  logger.info('Inventory event handlers registered');
}

/**
 * Initialize form event handlers
 */
export function initializeFormAutomationHandlers() {
  // FORM_PENDING → Schedule reminder
  on(Events.FORM_PENDING, async (payload) => {
    const { workspaceId, formSubmissionId, bookingId, formId, contactId } = payload;

    logger.info(
      { workspaceId, formSubmissionId, bookingId },
      'Form pending - scheduling reminder'
    );

    try {
      // Schedule reminder for 24 hours later
      await scheduleFormReminder({
        workspaceId,
        formSubmissionId,
        bookingId,
        formId,
        contactId,
      });

      // Schedule overdue check for 48 hours later
      await scheduleFormOverdueCheck({
        workspaceId,
        formSubmissionId,
        bookingId,
        formId,
      });

      logger.info(
        { formSubmissionId },
        'Form reminder and overdue check scheduled'
      );
    } catch (error) {
      logger.error(
        { error, formSubmissionId },
        'Failed to schedule form reminders'
      );
    }
  });

  // FORM_OVERDUE → Escalate alert
  on(Events.FORM_OVERDUE, async (payload) => {
    const { workspaceId, formSubmissionId, bookingId, formId } = payload;

    logger.info(
      { workspaceId, formSubmissionId },
      'Form overdue - creating alert'
    );

    try {
      // Get form and submission details
      const submission = await prisma.formSubmission.findUnique({
        where: { id: formSubmissionId },
        include: {
          form: true,
          booking: {
            include: { contact: true },
          },
        },
      });

      if (!submission) return;

      // Create alert
      await prisma.alert.create({
        data: {
          workspaceId,
          type: 'FORM_OVERDUE',
          message: `Form "${submission.form.name}" is overdue for ${submission.booking.contact.name}`,
          status: 'ACTIVE',
        },
      });

      // Send reminder to contact
      await sendFormReminder(
        workspaceId,
        submission,
        submission.booking.contact,
        submission.form
      );

      logger.info(
        { formSubmissionId },
        'Form overdue alert created'
      );
    } catch (error) {
      logger.error(
        { error, formSubmissionId },
        'Failed to handle form overdue'
      );
    }
  });

  logger.info('Form automation handlers registered');
}

/**
 * Register all automation event handlers
 */
export function registerAutomationEventHandlers() {
  initializeContactHandlers();
  initializeBookingAutomationHandlers();
  initializeInventoryHandlers();
  initializeFormAutomationHandlers();

  logger.info('All automation event handlers registered');
}
