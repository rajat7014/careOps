/**
 * Test Controller
 * 
 * Temporary test endpoints for SendGrid and Twilio integration verification.
 * These endpoints require authentication and use workspace integrations.
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { sendMessage } from '../../integrations/integration.service.js';

/**
 * GET /api/v1/test/email
 * Send test email using .env SendGrid credentials
 * Query params:
 *   - ?to=other@email.com (optional, defaults to user's email)
 *   - ?subject=Custom Subject (optional)
 * NOTE: This bypasses database integration check for quick testing
 */
export async function testEmail(req, res, next) {
  try {
    const { workspaceId, userId } = req;
    const { to: queryTo, subject: querySubject } = req.query;

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    // Use query param or fallback to user email
    const toEmail = queryTo || user?.email;

    if (!toEmail) {
      return res.status(400).json({
        success: false,
        error: { message: 'No recipient email provided. Use ?to=email@example.com or ensure user has an email.', code: 'NO_EMAIL' },
      });
    }

    // Check if SendGrid is configured in .env
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'SendGrid not configured in .env file. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.',
          code: 'SENDGRID_ENV_NOT_CONFIGURED',
        },
      });
    }

    // Import SendGrid directly for testing
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const subject = querySubject || 'Test Email from CareOps';
    const recipientName = user?.name || 'User';

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: subject,
      text: `Hello ${recipientName},\n\nThis is a test email from your CareOps workspace.\n\nIf you received this, your SendGrid integration is working correctly!\n\nSent to: ${toEmail}`,
      html: `<p>Hello ${recipientName},</p><p>This is a test email from your CareOps workspace.</p><p>If you received this, your SendGrid integration is working correctly!</p><p><small>Sent to: ${toEmail}</small></p>`,
    };

    const response = await sgMail.send(msg);

    logger.info(
      { workspaceId, userId, messageId: response[0]?.headers['x-message-id'], to: toEmail },
      'Test email sent successfully'
    );

    res.json({
      success: true,
      provider: 'sendgrid',
      messageId: response[0]?.headers['x-message-id'],
      to: toEmail,
      note: 'Test mode - bypassed database integration check',
    });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, 'Test email endpoint failed');
    
    // Handle SendGrid specific errors
    if (err.code === 401) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'SendGrid authentication failed. Please verify your API key is valid.',
          code: 'SENDGRID_AUTH_FAILED',
        },
      });
    } else if (err.code === 403) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'SendGrid sender email not verified. Please verify your sender email in SendGrid dashboard.',
          code: 'SENDGRID_SENDER_NOT_VERIFIED',
        },
      });
    }
    
    next(err);
  }
}

/**
 * GET /api/v1/test/sms
 * Send test SMS using .env Twilio credentials
 * Query params: 
 *   - ?phone=+1234567890 (optional, defaults to contact lookup)
 *   - ?mock=true (optional, simulates success without sending real SMS)
 * NOTE: This bypasses database integration check for quick testing
 */
export async function testSMS(req, res, next) {
  try {
    const { workspaceId, userId } = req;
    const { phone: queryPhone, mock: mockMode } = req.query;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    // Use query phone or find from contacts
    let phone = queryPhone;
    if (!phone) {
      const contact = await prisma.contact.findFirst({
        where: { email: user?.email },
        select: { phone: true },
      });
      phone = contact?.phone;
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No phone number provided. Use ?phone=+1234567890 query parameter or add a contact with phone number.',
          code: 'NO_PHONE',
        },
      });
    }

    // Check if Twilio is configured in .env
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Twilio not configured in .env file. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE.',
          code: 'TWILIO_ENV_NOT_CONFIGURED',
        },
      });
    }

    // Mock mode - simulate success without sending real SMS
    if (mockMode === 'true') {
      logger.info(
        { workspaceId, userId, phone, mock: true },
        'Test SMS simulated (mock mode)'
      );

      return res.json({
        success: true,
        provider: 'twilio',
        messageId: `mock-${Date.now()}`,
        to: phone,
        note: 'MOCK MODE - No actual SMS sent. Use ?mock=false to send real SMS.',
      });
    }

    // Import Twilio directly for testing
    const twilio = (await import('twilio')).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const message = await client.messages.create({
      to: phone,
      from: process.env.TWILIO_PHONE,
      body: `Hello ${user.name}! This is a test SMS from CareOps. Your Twilio integration is working!`,
    });

    logger.info(
      { workspaceId, userId, messageSid: message.sid },
      'Test SMS sent successfully'
    );

    res.json({
      success: true,
      provider: 'twilio',
      messageId: message.sid,
      to: phone,
      note: 'Test mode - bypassed database integration check',
    });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, 'Test SMS endpoint failed');
    
    // Handle Twilio specific errors
    if (err.code === 20003 || err.status === 401) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Twilio authentication failed. Please verify your Account SID and Auth Token.',
          code: 'TWILIO_AUTH_FAILED',
        },
      });
    } else if (err.code === 21211) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890).',
          code: 'TWILIO_INVALID_PHONE',
        },
      });
    } else if (err.code === 21408) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Twilio trial restriction: Can only send to verified numbers. Please verify this number in your Twilio console.',
          code: 'TWILIO_TRIAL_RESTRICTION',
        },
      });
    } else if (err.message && err.message.includes('not a Twilio phone number')) {
      return res.status(400).json({
        success: false,
        error: {
          message: `The 'From' number ${process.env.TWILIO_PHONE} is not a valid Twilio number for your account. In India, you need to either: 1) Purchase a Twilio Indian phone number, or 2) Use ?mock=true to test without sending real SMS.`,
          code: 'TWILIO_INVALID_SENDER',
        },
      });
    }
    
    next(err);
  }
}

/**
 * GET /api/v1/test/status
 * Check integration status for workspace
 */
export async function testStatus(req, res, next) {
  try {
    const { workspaceId } = req;

    const [emailIntegration, smsIntegration, workspace] = await Promise.all([
      prisma.integration.findFirst({
        where: { workspaceId, type: 'EMAIL', isActive: true },
        select: { id: true, provider: true, isActive: true, createdAt: true },
      }),
      prisma.integration.findFirst({
        where: { workspaceId, type: 'SMS', isActive: true },
        select: { id: true, provider: true, isActive: true, createdAt: true },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { isActive: true, name: true },
      }),
    ]);

    // Check environment variables
    const envStatus = {
      sendgridApiKey: !!process.env.SENDGRID_API_KEY,
      sendgridFromEmail: !!process.env.SENDGRID_FROM_EMAIL,
      twilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      twilioPhone: !!process.env.TWILIO_PHONE,
    };

    res.json({
      success: true,
      data: {
        workspace: {
          name: workspace?.name,
          isActive: workspace?.isActive,
        },
        integrations: {
          email: emailIntegration || null,
          sms: smsIntegration || null,
        },
        environment: envStatus,
      },
    });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, 'Test status endpoint failed');
    next(err);
  }
}
