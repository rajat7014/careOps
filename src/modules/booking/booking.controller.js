import * as bookingService from './booking.service.js';

export async function list(req, res, next) {
  try {
    const result = await bookingService.list(req.workspaceId, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const result = await bookingService.getById(req.workspaceId, req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: { message: 'Booking not found' } });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const result = await bookingService.create(req.workspaceId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const result = await bookingService.update(req.workspaceId, req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ success: false, error: { message: 'Booking not found' } });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const deleted = await bookingService.remove(req.workspaceId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Booking not found' } });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
