/**
 * Centralized Event Registry
 * 
 * Defines all domain events in the system with their metadata.
 * This provides a single source of truth for event names and payloads.
 */

export const Events = {
  // Contact lifecycle
  CONTACT_CREATED: 'contact.created',
  
  // Booking lifecycle
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_DELETED: 'booking.deleted',
  
  // Form lifecycle
  FORM_PENDING: 'form.pending',
  FORM_COMPLETED: 'form.completed',
  FORM_OVERDUE: 'form.overdue',
  
  // Inventory alerts
  INVENTORY_LOW: 'inventory.low',
  
  // Conversation/Messaging
  STAFF_REPLIED: 'staff.replied',
  CONTACT_REPLIED: 'contact.replied',
  
  // Automation jobs (internal)
  SEND_CONFIRMATION: 'automation.sendConfirmation',
  SEND_REMINDER: 'automation.sendReminder',
  CREATE_FORM_SUBMISSION: 'automation.createFormSubmission',
  CANCEL_SCHEDULED_JOBS: 'automation.cancelScheduledJobs',
};

/**
 * Event metadata for validation and documentation
 */
export const EventMetadata = {
  [Events.CONTACT_CREATED]: {
    description: 'Triggered when a new contact is created',
    payload: ['workspaceId', 'contactId', 'contact'],
  },
  [Events.BOOKING_CREATED]: {
    description: 'Triggered when a new booking is created',
    payload: ['workspaceId', 'bookingId', 'booking', 'contactId'],
  },
  [Events.BOOKING_UPDATED]: {
    description: 'Triggered when a booking is updated',
    payload: ['workspaceId', 'bookingId', 'booking'],
  },
  [Events.BOOKING_DELETED]: {
    description: 'Triggered when a booking is deleted',
    payload: ['workspaceId', 'bookingId'],
  },
  [Events.FORM_PENDING]: {
    description: 'Triggered when a form submission becomes pending',
    payload: ['workspaceId', 'formSubmissionId', 'bookingId', 'formId'],
  },
  [Events.INVENTORY_LOW]: {
    description: 'Triggered when inventory falls below threshold',
    payload: ['workspaceId', 'itemId', 'item', 'quantity', 'threshold'],
  },
  [Events.STAFF_REPLIED]: {
    description: 'Triggered when staff replies to a conversation',
    payload: ['workspaceId', 'conversationId', 'messageId', 'message'],
  },
  [Events.CONTACT_REPLIED]: {
    description: 'Triggered when contact replies to a conversation',
    payload: ['workspaceId', 'conversationId', 'messageId', 'message'],
  },
};

/**
 * Automation job types for BullMQ
 */
export const AutomationJobs = {
  SEND_BOOKING_CONFIRMATION: 'sendBookingConfirmation',
  SEND_BOOKING_REMINDER: 'sendBookingReminder',
  CREATE_FORM_SUBMISSION: 'createFormSubmission',
  CHECK_FORM_OVERDUE: 'checkFormOverdue',
  SEND_INVENTORY_ALERT: 'sendInventoryAlert',
  SEND_FORM_REMINDER: 'sendFormReminder',
};

/**
 * Queue names
 */
export const Queues = {
  AUTOMATION: 'automation',
  BOOKING: 'booking',
  NOTIFICATIONS: 'notifications',
};

/**
 * Get event metadata
 * @param {string} eventName
 * @returns {object|null}
 */
export function getEventMetadata(eventName) {
  return EventMetadata[eventName] || null;
}

/**
 * Validate event payload (basic check)
 * @param {string} eventName
 * @param {object} payload
 * @returns {boolean}
 */
export function validateEventPayload(eventName, payload) {
  const metadata = EventMetadata[eventName];
  if (!metadata) return true; // Unknown events pass validation
  
  // Check required fields exist
  return metadata.payload.every(field => field in payload);
}
