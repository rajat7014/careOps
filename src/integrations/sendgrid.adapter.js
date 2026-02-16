/**
 * SendGrid Email Adapter
 * 
 * Real SendGrid integration for sending emails
 * Includes retry logic and failure handling
 */

import sgMail from '@sendgrid/mail';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

/**
 * Initialize SendGrid with API key
 * @param {string} apiKey
 */
export function initializeSendGrid(apiKey) {
  sgMail.setApiKey(apiKey);
  logger.info('SendGrid initialized');
}

/**
 * Send email via SendGrid
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.from
 * @param {string} params.subject
 * @param {string} params.text
 * @param {string} [params.html]
 * @param {string} workspaceId
 * @param {string} integrationId
 */
export async function sendEmail(params, workspaceId, integrationId) {
  const { to, from, subject, text, html } = params;

  // Create log entry
  const logEntry = await prisma.integrationLog.create({
    data: {
      workspaceId,
      integrationId,
      type: 'EMAIL',
      provider: 'sendgrid',
      to,
      subject,
      content: text || html,
      status: 'PENDING',
    },
  });

  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text,
      html: html || text,
    };

    const response = await sgMail.send(msg);

    // Update log as sent
    await prisma.integrationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    logger.info(
      { to, subject, workspaceId, messageId: response[0]?.headers['x-message-id'] },
      'Email sent via SendGrid'
    );

    return {
      success: true,
      messageId: response[0]?.headers['x-message-id'],
      logId: logEntry.id,
    };
  } catch (error) {
    // Extract detailed error message from SendGrid response
    let errorMessage = error.message;
    let errorCode = error.code;
    
    // SendGrid specific error handling
    if (error.response) {
      const body = error.response.body;
      if (body && body.errors && body.errors.length > 0) {
        errorMessage = body.errors.map(e => e.message).join('; ');
      }
    }
    
    // Map common SendGrid errors to user-friendly messages
    if (error.code === 401) {
      errorMessage = 'SendGrid authentication failed. Please verify your API key is valid and has not expired.';
      errorCode = 'SENDGRID_AUTH_FAILED';
    } else if (error.code === 403) {
      errorMessage = 'SendGrid sender email not verified or not authorized. Please verify your sender email in SendGrid dashboard.';
      errorCode = 'SENDGRID_SENDER_NOT_VERIFIED';
    } else if (error.message && error.message.includes('from address')) {
      errorMessage = `The sender email (${process.env.SENDGRID_FROM_EMAIL}) is not verified in SendGrid. Please verify it at https://app.sendgrid.com/settings/sender_auth`;
      errorCode = 'SENDGRID_INVALID_SENDER';
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
      { error: errorMessage, originalError: error.message, code: error.code, to, subject, workspaceId },
      'Failed to send email via SendGrid'
    );

    // Create enhanced error with code
    const enhancedError = new Error(errorMessage);
    enhancedError.code = errorCode || error.code;
    throw enhancedError;
  }
}

/**
 * Send email with retry logic
 * @param {object} params
 * @param {string} workspaceId
 * @param {string} integrationId
 * @param {number} maxRetries
 */
export async function sendEmailWithRetry(params, workspaceId, integrationId, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(params, workspaceId, integrationId);
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.code === 401) {
        // Authentication error - don't retry
        break;
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(
          { attempt, delay, error: error.message },
          'Email send failed, retrying...'
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
