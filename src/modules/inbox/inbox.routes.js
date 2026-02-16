/**
 * Inbox Routes
 * 
 * Staff-facing conversation management endpoints
 * Protected by STAFF/OWNER authentication
 */

import { Router } from 'express';
import * as inboxController from './inbox.controller.js';
import { requireAuth, authorizeRole } from '../../middleware/auth.js';

const router = Router();

// All inbox routes require authentication
router.use(...requireAuth());

/**
 * @route   GET /api/v1/inbox/conversations
 * @desc    List all conversations
 * @access  Staff/Owner
 */
router.get('/conversations', inboxController.listConversations);

/**
 * @route   GET /api/v1/inbox/conversations/:id
 * @desc    Get single conversation with messages
 * @access  Staff/Owner
 */
router.get('/conversations/:id', inboxController.getConversation);

/**
 * @route   GET /api/v1/inbox/conversations/:id/messages
 * @desc    Get messages for a conversation
 * @access  Staff/Owner
 */
router.get('/conversations/:id/messages', inboxController.getMessages);

/**
 * @route   POST /api/v1/inbox/messages
 * @desc    Send a staff reply
 * @access  Staff/Owner
 */
router.post('/messages', inboxController.sendMessage);

/**
 * @route   GET /api/v1/inbox/stats
 * @desc    Get conversation statistics
 * @access  Staff/Owner
 */
router.get('/stats', inboxController.getStats);

export default router;
