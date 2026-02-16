/**
 * Inbox Service
 * 
 * Handles conversation and message operations
 * - List conversations
 * - Get conversation messages
 * - Send staff replies
 * - Cancel scheduled jobs on manual reply
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { emit, Events } from '../../lib/events/eventBus.js';
import { cancelScheduledJobsByConversation } from '../../lib/queue/automationQueue.js';

/**
 * Get all conversations for a workspace
 * @param {string} workspaceId
 * @param {object} query - Filters and pagination
 */
export async function listConversations(workspaceId, query = {}) {
  const { limit = 50, offset = 0, search } = query;

  const where = { workspaceId };

  if (search) {
    where.contact = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            sender: true,
            createdAt: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(offset),
      take: parseInt(limit),
    }),
    prisma.conversation.count({ where }),
  ]);

  // Format response
  const formattedConversations = conversations.map((conv) => ({
    id: conv.id,
    contact: conv.contact,
    messageCount: conv._count.messages,
    lastMessage: conv.messages[0] || null,
    createdAt: conv.createdAt,
  }));

  return {
    conversations: formattedConversations,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: total > parseInt(offset) + parseInt(limit),
    },
  };
}

/**
 * Get a single conversation with all messages
 * @param {string} workspaceId
 * @param {string} conversationId
 */
export async function getConversation(workspaceId, conversationId) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    include: {
      contact: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          channel: true,
          sender: true,
          content: true,
          createdAt: true,
        },
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  return conversation;
}

/**
 * Send a message as staff reply
 * This will cancel scheduled automation jobs for this conversation
 * @param {string} workspaceId
 * @param {string} userId - Staff user ID
 * @param {object} data
 * @param {string} data.conversationId
 * @param {string} data.content
 * @param {string} [data.channel] - EMAIL or SMS (defaults based on contact preference)
 */
export async function sendStaffReply(workspaceId, userId, data) {
  const { conversationId, content, channel: preferredChannel } = data;

  const result = await prisma.$transaction(async (tx) => {
    // Get conversation with contact
    const conversation = await tx.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Determine channel based on contact info or preference
    let channel = preferredChannel;
    if (!channel) {
      if (conversation.contact.email) {
        channel = 'EMAIL';
      } else if (conversation.contact.phone) {
        channel = 'SMS';
      } else {
        throw new Error('Contact has no email or phone for messaging');
      }
    }

    // Create message
    const message = await tx.message.create({
      data: {
        conversationId,
        channel,
        sender: 'STAFF',
        content,
      },
    });

    return { message, conversation, channel };
  });

  // Emit staff replied event (outside transaction for performance)
  emit(Events.STAFF_REPLIED, {
    workspaceId,
    conversationId,
    messageId: result.message.id,
    message: result.message,
    channel: result.channel,
    contactId: result.conversation.contactId,
  });

  // Cancel scheduled automation jobs for this conversation
  const cancelledCount = await cancelScheduledJobsByConversation(conversationId);

  logger.info(
    {
      workspaceId,
      conversationId,
      messageId: result.message.id,
      cancelledCount,
    },
    'Staff reply sent and automation jobs cancelled'
  );

  return {
    message: result.message,
    cancelledCount,
  };
}

/**
 * Get or create conversation for a contact
 * Ensures one conversation per contact
 * @param {string} workspaceId
 * @param {string} contactId
 */
export async function getOrCreateConversation(workspaceId, contactId) {
  let conversation = await prisma.conversation.findFirst({
    where: { workspaceId, contactId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        contactId,
      },
    });

    logger.info(
      { workspaceId, contactId, conversationId: conversation.id },
      'New conversation created'
    );
  }

  return conversation;
}

/**
 * Get conversation stats for dashboard
 * @param {string} workspaceId
 */
export async function getConversationStats(workspaceId) {
  const [total, withUnread, recent] = await Promise.all([
    prisma.conversation.count({ where: { workspaceId } }),
    // Conversations where last message is from contact (unread by staff)
    prisma.conversation.count({
      where: {
        workspaceId,
        messages: {
          some: {
            sender: 'CONTACT',
          },
        },
      },
    }),
    // Conversations in last 7 days
    prisma.conversation.count({
      where: {
        workspaceId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    total,
    withUnread,
    recent,
  };
}
