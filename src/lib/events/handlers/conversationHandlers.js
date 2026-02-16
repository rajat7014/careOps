/**
 * Conversation Event Handlers
 * 
 * Demonstrates cancellation logic when staff replies to a conversation.
 * This shows how to integrate event listening with job cancellation.
 */

import { on, Events } from '../eventBus.js';
import { cancelScheduledJobsByConversation } from '../../queue/automationQueue.js';
import { logger } from '../../logger.js';

/**
 * Initialize conversation event handlers
 * Call this after Redis connection is established
 */
export function initializeConversationHandlers() {
  // Handle staff reply - cancel all scheduled jobs for this conversation
  on(Events.STAFF_REPLIED, async (payload) => {
    const { workspaceId, conversationId, messageId, message } = payload;

    logger.info(
      { workspaceId, conversationId, messageId },
      'Staff replied - cancelling scheduled jobs'
    );

    // Cancel all scheduled automation jobs for this conversation
    const cancelledCount = await cancelScheduledJobsByConversation(conversationId);

    logger.info(
      { workspaceId, conversationId, cancelledCount },
      'Cancelled scheduled jobs due to staff reply'
    );

    // Additional logic: Mark conversation as handled, notify contact, etc.
    // await markConversationHandled(conversationId);
  });

  // Handle contact reply - could trigger auto-responder or staff notification
  on(Events.CONTACT_REPLIED, async (payload) => {
    const { workspaceId, conversationId, messageId, message } = payload;

    logger.info(
      { workspaceId, conversationId, messageId },
      'Contact replied'
    );

    // Example: Pause reminder jobs but keep confirmation jobs
    // const cancelledCount = await cancelScheduledJobsByConversation(conversationId, ['reminder']);
  });

  logger.info('Conversation event handlers registered');
}

/**
 * Example: Booking created handler
 * Shows how to set up jobs that can be cancelled later
 */
export function initializeBookingHandlers() {
  on(Events.BOOKING_CREATED, async (payload) => {
    const { workspaceId, bookingId, contactId, booking } = payload;

    logger.info(
      { workspaceId, bookingId, contactId },
      'Booking created event received'
    );

    // The actual job scheduling is done in the service layer
    // This handler is for any additional side effects
  });

  logger.info('Booking event handlers registered');
}

/**
 * Example: Form pending handler
 */
export function initializeFormHandlers() {
  on(Events.FORM_PENDING, async (payload) => {
    const { workspaceId, formSubmissionId, bookingId, formId } = payload;

    logger.info(
      { workspaceId, formSubmissionId, bookingId, formId },
      'Form pending - scheduling follow-up'
    );

    // Schedule a delayed job to check if form is still pending after 24 hours
    // This job can be cancelled if the form is submitted
  });

  logger.info('Form event handlers registered');
}

/**
 * Register all event handlers
 * Call this after Redis connection is established
 */
export function registerAllEventHandlers() {
  initializeConversationHandlers();
  initializeBookingHandlers();
  initializeFormHandlers();

  logger.info('All event handlers registered');
}
