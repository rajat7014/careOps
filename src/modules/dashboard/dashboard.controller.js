import * as dashboardService from './dashboard.service.js';

export async function getStats(req, res, next) {
  try {
    const stats = await dashboardService.getDashboardStats(req.workspaceId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

export async function getRecent(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const bookings = await dashboardService.getRecentBookings(req.workspaceId, limit);
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}
