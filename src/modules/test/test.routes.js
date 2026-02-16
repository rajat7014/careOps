/**
 * Test Routes
 * 
 * Temporary test endpoints for integration verification.
 * These should be removed or disabled in production.
 */

import { Router } from 'express';
import { testEmail, testSMS, testStatus } from './test.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// All test routes require authentication
router.use(...requireAuth());

/**
 * @route   GET /api/v1/test/email
 * @desc    Send test email using workspace SendGrid integration
 * @access  Private
 */
router.get('/email', testEmail);

/**
 * @route   GET /api/v1/test/sms
 * @desc    Send test SMS using workspace Twilio integration
 * @access  Private
 */
router.get('/sms', testSMS);

/**
 * @route   GET /api/v1/test/status
 * @desc    Check integration status for workspace
 * @access  Private
 */
router.get('/status', testStatus);

export default router;
