/**
 * Twilio SMS Adapter
 * 
 * Real Twilio integration for sending SMS
 * Includes retry logic and failure handling
 */

import twilio from 'twilio';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

/**
 * Create Twilio client
 * @param {string} accountSid
 * @param {string} authToken
 */
export function createTwilioClient(accountSid, authToken) {
  return twilio(accountSid, authToken);
}

/**
 * Send SMS via Twilio
 * @param {object} params
 * @param {string} params.to - Phone number to send to
 * @param {string} params.from - Twilio phone number
 * @param {string} params.body - Message body
 * @param {string} workspaceId
 * @param {string} integrationId
 * @param {object} client - Twilio client instance
 */
export async function sendSMS(params, workspaceId, integrationId, client) {
  const { to, from, body } = params;

  // Create log entry
  const logEntry = await prisma.integrationLog.create({
    data: {
      workspaceId,
      integrationId,
      type: 'SMS',
      provider: 'twilio',
      to,
      subject: null,
      content: body,
      status: 'PENDING',
    },
  });

  try {
    const message = await client.messages.create({
      to,
      from,
      body,
    });

    // Update log as sent
    await prisma.integrationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    logger.info(
      { to, workspaceId, messageSid: message.sid },
      'SMS sent via Twilio'
    );

    return {
      success: true,
      messageSid: message.sid,
      logId: logEntry.id,
    };
  } catch (error) {
    // Extract detailed error message from Twilio
    let errorMessage = error.message;
    let errorCode = error.code;
    
    // Twilio specific error handling
    if (error.code === 20003) {
      errorMessage = 'Twilio authentication failed. Please check your Account SID and Auth Token.';
      errorCode = 'TWILIO_AUTH_FAILED';
    } else if (error.code === 21603) {
      errorMessage = 'Twilio phone number not verified. Please verify your Twilio phone number.';
      errorCode = 'TWILIO_PHONE_NOT_VERIFIED';
    } else if (error.code === 21211) {
      errorMessage = 'Invalid "To" phone number. Please check the recipient phone number format (E.164 format required, e.g., +1234567890).';
      errorCode = 'TWILIO_INVALID_PHONE';
    } else if (error.code === 21408) {
      errorMessage = 'Twilio trial account restriction: You can only send SMS to verified numbers. Please verify this number in your Twilio console or upgrade your account.';
      errorCode = 'TWILIO_TRIAL_RESTRICTION';
    } else if (error.status === 401) {
      errorMessage = 'Twilio authentication failed. Please verify your Account SID and Auth Token are correct.';
      errorCode = 'TWILIO_AUTH_FAILED';
    }
    
    // Update log as failed
    await prisma.integrationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'FAILED',
        error: errorMessage,
        retryCount: { increment: 1 },
      },
    });

    logger.error(
      { error: errorMessage, originalError: error.message, code: error.code, to, workspaceId },
      'Failed to send SMS via Twilio'
    );

    // Create enhanced error with code
    const enhancedError = new Error(errorMessage);
    enhancedError.code = errorCode || error.code;
    throw enhancedError;
  }
}

/**
 * Send SMS with retry logic
 * @param {object} params
 * @param {string} workspaceId
 * @param {string} integrationId
 * @param {object} client - Twilio client
 * @param {number} maxRetries
 */
export async function sendSMSWithRetry(params, workspaceId, integrationId, client, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendSMS(params, workspaceId, integrationId, client);
    } catch (error) {
      lastError = error;
      
      // Don't retry on authentication errors
      if (error.code === 20003 || error.code === 21603) {
        break;
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(
          { attempt, delay, error: error.message },
          'SMS send failed, retrying...'
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Mock Twilio adapter for development/testing
 * Logs messages instead of actually sending
 */
export const mockTwilioAdapter = {
  async sendSMS(params, workspaceId, integrationId) {
    const { to, body } = params;

    logger.info(
      { to, body, workspaceId },
      '[MOCK] SMS would be sent via Twilio'
    );

    // Still create log entry
    const logEntry = await prisma.integrationLog.create({
      data: {
        workspaceId,
        integrationId,
        type: 'SMS',
        provider: 'twilio-mock',
        to,
        subject: null,
        content: body,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      messageSid: `mock-${Date.now()}`,
      logId: logEntry.id,
      mock: true,
    };
  },
};
