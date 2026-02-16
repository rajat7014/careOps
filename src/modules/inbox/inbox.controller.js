/**
 * Inbox Controller
 * 
 * Handles inbox/conversation HTTP requests
 * Protected by STAFF/OWNER authentication
 */

import * as inboxService from './inbox.service.js';
import { logger } from '../../lib/logger.js';

/**
 * GET /inbox/conversations
 * List all conversations
 */
export async function listConversations(req, res, next) {
  try {
    const { workspaceId } = req;
    const { limit, offset, search } = req.query;

    const result = await inboxService.listConversations(workspaceId, {
      limit,
      offset,
      search,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list conversations');
    next(err);
  }
}

/**
 * GET /inbox/conversations/:id
 * Get single conversation with messages
 */
export async function getConversation(req, res, next) {
  try {
    const { workspaceId } = req;
    const { id } = req.params;

    const conversation = await inboxService.getConversation(workspaceId, id);

    res.json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    if (err.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found', code: 'NOT_FOUND' },
      });
    }
    logger.error({ err }, 'Failed to get conversation');
    next(err);
  }
}

/**
 * GET /inbox/conversations/:id/messages
 * Get messages for a conversation
 */
export async function getMessages(req, res, next) {
  try {
    const { workspaceId } = req;
    const { id } = req.params;

    const conversation = await inboxService.getConversation(workspaceId, id);

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        contact: conversation.contact,
        messages: conversation.messages,
      },
    });
  } catch (err) {
    if (err.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found', code: 'NOT_FOUND' },
      });
    }
    logger.error({ err }, 'Failed to get messages');
    next(err);
  }
}

/**
 * POST /inbox/messages
 * Send a staff reply
 */
export async function sendMessage(req, res, next) {
  try {
    const { workspaceId } = req;
    const userId = req.userId;
    const { conversationId, content, channel } = req.body;

    // Validation
    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'conversationId and content are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const result = await inboxService.sendStaffReply(workspaceId, userId, {
      conversationId,
      content,
      channel,
    });

    res.json({
      success: true,
      data: {
        message: result.message,
        cancelledJobs: result.cancelledCount,
      },
    });
  } catch (err) {
    if (err.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found', code: 'NOT_FOUND' },
      });
    }
    if (err.message === 'Contact has no email or phone for messaging') {
      return res.status(400).json({
        success: false,
        error: {
          message: err.message,
          code: 'NO_CONTACT_CHANNEL',
        },
      });
    }
    logger.error({ err }, 'Failed to send message');
    next(err);
  }
}

/**
 * GET /inbox/stats
 * Get conversation statistics
 */
export async function getStats(req, res, next) {
  try {
    const { workspaceId } = req;

    const stats = await inboxService.getConversationStats(workspaceId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get inbox stats');
    next(err);
  }
}
