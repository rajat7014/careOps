/**
 * Dashboard Service
 * 
 * Provides aggregated stats for the dashboard overview.
 */

import { prisma } from '../../lib/prisma.js';

/**
 * Get dashboard stats for a workspace
 * @param {string} workspaceId
 * @returns {Promise<object>}
 */
export async function getDashboardStats(workspaceId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get counts
  const [
    totalBookings,
    thisMonthBookings,
    lastMonthBookings,
    totalContacts,
    lastMonthContacts,
    inventoryItems,
    lowInventory,
    totalConversations,
    conversationsWithUnread,
    pendingForms,
    overdueForms,
    unconfirmedBookings,
    recentLeads,
  ] = await Promise.all([
    prisma.booking.count({ where: { workspaceId } }),
    prisma.booking.count({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.booking.count({
      where: {
        workspaceId,
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    }),
    prisma.contact.count({ where: { workspaceId } }),
    prisma.contact.count({
      where: {
        workspaceId,
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    }),
    prisma.inventoryItem.count({ where: { workspaceId } }),
    prisma.inventoryItem.count({
      where: {
        workspaceId,
        quantity: { lte: prisma.inventoryItem.fields.threshold },
      },
    }),
    // Conversations
    prisma.conversation.count({ where: { workspaceId } }),
    prisma.conversation.count({
      where: {
        workspaceId,
        messages: {
          some: {
            sender: 'CONTACT',
            createdAt: { gte: sevenDaysAgo },
          },
        },
      },
    }),
    // Forms
    prisma.formSubmission.count({
      where: {
        booking: { workspaceId },
        status: 'PENDING',
      },
    }),
    prisma.formSubmission.count({
      where: {
        booking: { workspaceId },
        status: 'OVERDUE',
      },
    }),
    // Unconfirmed bookings (created in last 24h but no confirmation sent - check via logs)
    prisma.booking.count({
      where: {
        workspaceId,
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        status: 'CONFIRMED',
      },
    }),
    // Recent leads (contacts created in last 7 days)
    prisma.contact.count({
      where: {
        workspaceId,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  // Calculate trends
  const revenue = thisMonthBookings * 50;
  const lastMonthRevenue = lastMonthBookings * 50;
  const revenueTrend = lastMonthRevenue > 0
    ? ((revenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
    : '0';

  const bookingsTrend = lastMonthBookings > 0
    ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings * 100).toFixed(1)
    : '0';

  const contactsTrend = lastMonthContacts > 0
    ? ((totalContacts - lastMonthContacts) / lastMonthContacts * 100).toFixed(1)
    : '0';

  // Get inventory alerts with details
  const inventoryAlerts = await prisma.inventoryItem.findMany({
    where: {
      workspaceId,
      quantity: { lte: prisma.inventoryItem.fields.threshold },
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      threshold: true,
    },
  });

  // Get active alerts from Alert table
  const activeAlerts = await prisma.alert.findMany({
    where: {
      workspaceId,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      message: true,
      createdAt: true,
    },
  });

  // Map alerts to actionable links
  const actionableAlerts = activeAlerts.map((alert) => {
    let link = '/dashboard';
    if (alert.type === 'INVENTORY_LOW') {
      link = '/dashboard/inventory';
    } else if (alert.type.includes('FORM')) {
      link = '/dashboard/forms';
    } else if (alert.type.includes('BOOKING')) {
      link = '/dashboard/bookings';
    }
    return {
      ...alert,
      link,
    };
  });

  return {
    bookings: {
      total: totalBookings,
      thisMonth: thisMonthBookings,
      trend: parseFloat(bookingsTrend),
    },
    revenue: {
      total: revenue,
      trend: parseFloat(revenueTrend),
    },
    contacts: {
      total: totalContacts,
      trend: parseFloat(contactsTrend),
      recentLeads,
    },
    inventory: {
      total: inventoryItems,
      low: lowInventory,
      alerts: inventoryAlerts,
    },
    conversations: {
      total: totalConversations,
      withUnread: conversationsWithUnread,
    },
    forms: {
      pending: pendingForms,
      overdue: overdueForms,
    },
    alerts: actionableAlerts,
  };
}

/**
 * Get recent bookings for dashboard
 * @param {string} workspaceId
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
export async function getRecentBookings(workspaceId, limit = 5) {
  const bookings = await prisma.booking.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      contact: {
        select: { name: true, email: true },
      },
      bookingType: {
        select: { name: true },
      },
    },
  });

  return bookings.map((booking) => ({
    id: booking.id,
    contactName: booking.contact?.name || 'Unknown',
    service: booking.bookingType?.name || 'Unknown',
    scheduledAt: booking.scheduledAt,
    status: booking.status.toLowerCase(),
  }));
}
