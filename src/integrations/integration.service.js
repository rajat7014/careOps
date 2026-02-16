/**
 * Integration Service
 * 
 * Abstraction layer for sending messages via configured integrations
 * Handles provider selection, fallback, and error handling
 */

import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import * as sendgridAdapter from './sendgrid.adapter.js';
import * as twilioAdapter from './twilio.adapter.js';

// Cache for integration clients
const integrationClients = new Map();

/**
 * Get or create integration client
 * @param {object} integration
 */
function getIntegrationClient(integration) {
  const cacheKey = `${integration.workspaceId}-${integration.type}`;

  if (integrationClients.has(cacheKey)) {
    return integrationClients.get(cacheKey);
  }

  const config = JSON.parse(integration.config);
  let client;

  if (integration.type === 'EMAIL' && integration.provider === 'sendgrid') {
    sendgridAdapter.initializeSendGrid(config.apiKey);
    client = { type: 'sendgrid' };
  } else if (integration.type === 'SMS' && integration.provider === 'twilio') {
    client = twilioAdapter.createTwilioClient(config.accountSid, config.authToken);
    client.type = 'twilio';
    client.fromNumber = config.fromNumber;
  }

  if (client) {
    integrationClients.set(cacheKey, client);
  }

  return client;
}

/**
 * Get active integration for workspace by type
 * @param {string} workspaceId
 * @param {string} type - EMAIL or SMS
 */
async function getActiveIntegration(workspaceId, type) {
  return prisma.integration.findFirst({
    where: {
      workspaceId,
      type,
      isActive: true,
    },
  });
}

/**
 * Send message via appropriate integration
 * Gracefully handles failures without breaking core flow
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.type - EMAIL or SMS
 * @param {string} params.to - Recipient (email or phone)
 * @param {string} params.subject - Subject (for email)
 * @param {string} params.content - Message content
 * @param {string} [params.preferredProvider] - Optional provider preference
 */
export async function sendMessage(params) {
  const { workspaceId, type, to, subject, content, preferredProvider } = params;

  try {
    // Get active integration
    const integration = await getActiveIntegration(workspaceId, type);

    if (!integration) {
      logger.warn(
        { workspaceId, type, to },
        `No active ${type} integration configured`
      );
      return {
        success: false,
        error: `No active ${type} integration configured`,
        code: 'INTEGRATION_NOT_CONFIGURED',
      };
    }

    // Check if preferred provider matches
    if (preferredProvider && integration.provider !== preferredProvider) {
      logger.warn(
        { workspaceId, type, preferredProvider, actual: integration.provider },
        'Preferred provider does not match configured integration'
      );
    }

    const client = getIntegrationClient(integration);

    if (!client) {
      throw new Error(`Failed to initialize ${integration.provider} client`);
    }

    // Send based on type and provider
    let result;

    if (type === 'EMAIL' && integration.provider === 'sendgrid') {
      result = await sendgridAdapter.sendEmailWithRetry(
        {
          to,
          subject,
          text: content,
        },
        workspaceId,
        integration.id
      );
    } else if (type === 'SMS' && integration.provider === 'twilio') {
      result = await twilioAdapter.sendSMSWithRetry(
        {
          to,
          from: client.fromNumber,
          body: content,
        },
        workspaceId,
        integration.id,
        client
      );
    } else {
      // Fallback to mock for unsupported combinations
      logger.warn(
        { type, provider: integration.provider },
        'Using mock adapter for unsupported integration'
      );
      result = await twilioAdapter.mockTwilioAdapter.sendSMS(
        { to, body: content },
        workspaceId,
        integration.id
      );
    }

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    logger.error(
      { error: error.message, code: error.code, workspaceId, type, to },
      'Failed to send message via integration'
    );

    // Don't throw - allow core flow to continue
    return {
      success: false,
      error: error.message,
      code: error.code || 'SEND_FAILED',
    };
  }
}

/**
 * Send welcome message to new contact
 * @param {string} workspaceId
 * @param {object} contact
 * @param {string} [contact.email]
 * @param {string} [contact.phone]
 * @param {string} contact.name
 */
export async function sendWelcomeMessage(workspaceId, contact) {
  const content = `Welcome ${contact.name}! Thank you for contacting us. We'll get back to you shortly.`;

  const results = [];

  if (contact.email) {
    const result = await sendMessage({
      workspaceId,
      type: 'EMAIL',
      to: contact.email,
      subject: 'Welcome!',
      content,
    });
    results.push({ channel: 'EMAIL', ...result });
  }

  if (contact.phone) {
    const result = await sendMessage({
      workspaceId,
      type: 'SMS',
      to: contact.phone,
      content,
    });
    results.push({ channel: 'SMS', ...result });
  }

  return results;
}

/**
 * Send booking confirmation
 * @param {string} workspaceId
 * @param {object} booking
 * @param {object} contact
 */
export async function sendBookingConfirmation(workspaceId, booking, contact) {
  const scheduledDate = new Date(booking.scheduledAt).toLocaleString();
  const content = `Your booking for "${booking.bookingType.name}" on ${scheduledDate} is confirmed. Reference: ${booking.id}`;

  const results = [];

  if (contact.email) {
    const result = await sendMessage({
      workspaceId,
      type: 'EMAIL',
      to: contact.email,
      subject: 'Booking Confirmed',
      content,
    });
    results.push({ channel: 'EMAIL', ...result });
  }

  if (contact.phone) {
    const result = await sendMessage({
      workspaceId,
      type: 'SMS',
      to: contact.phone,
      content,
    });
    results.push({ channel: 'SMS', ...result });
  }

  return results;
}

/**
 * Send booking reminder
 * @param {string} workspaceId
 * @param {object} booking
 * @param {object} contact
 */
export async function sendBookingReminder(workspaceId, booking, contact) {
  const scheduledDate = new Date(booking.scheduledAt).toLocaleString();
  const content = `Reminder: You have "${booking.bookingType.name}" scheduled for ${scheduledDate}. Reference: ${booking.id}`;

  const results = [];

  if (contact.email) {
    const result = await sendMessage({
      workspaceId,
      type: 'EMAIL',
      to: contact.email,
      subject: 'Booking Reminder',
      content,
    });
    results.push({ channel: 'EMAIL', ...result });
  }

  if (contact.phone) {
    const result = await sendMessage({
      workspaceId,
      type: 'SMS',
      to: contact.phone,
      content,
    });
    results.push({ channel: 'SMS', ...result });
  }

  return results;
}

/**
 * Send form reminder
 * @param {string} workspaceId
 * @param {object} formSubmission
 * @param {object} contact
 * @param {object} form
 */
export async function sendFormReminder(workspaceId, formSubmission, contact, form) {
  const content = `Please complete the form "${form.name}" for your booking. Reference: ${formSubmission.id}`;

  const results = [];

  if (contact.email) {
    const result = await sendMessage({
      workspaceId,
      type: 'EMAIL',
      to: contact.email,
      subject: 'Form Reminder',
      content,
    });
    results.push({ channel: 'EMAIL', ...result });
  }

  if (contact.phone) {
    const result = await sendMessage({
      workspaceId,
      type: 'SMS',
      to: contact.phone,
      content,
    });
    results.push({ channel: 'SMS', ...result });
  }

  return results;
}

/**
 * Get integration logs for workspace
 * @param {string} workspaceId
 * @param {object} query
 */
export async function getIntegrationLogs(workspaceId, query = {}) {
  const { limit = 50, offset = 0, status, type } = query;

  const where = { workspaceId };
  if (status) where.status = status;
  if (type) where.type = type;

  const [logs, total] = await Promise.all([
    prisma.integrationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: parseInt(offset),
      take: parseInt(limit),
    }),
    prisma.integrationLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: total > parseInt(offset) + parseInt(limit),
    },
  };
}
