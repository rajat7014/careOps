import { on } from '../../lib/events/emitter.js';
import { logger } from '../../lib/logger.js';
import { getQueue } from '../../lib/queue/index.js';

/**
 * Subscribe to booking domain events. Use for automation, side effects, or enqueueing jobs.
 * No business logic here—foundation only.
 */
export function registerBookingEvents() {
  on('booking.created', async (payload) => {
    logger.info({ payload }, 'Booking created event');
    const queue = getQueue('booking');
    if (queue) {
      await queue.add('onCreated', payload, { jobId: `booking-created-${payload.bookingId}` });
    }
  });

  on('booking.updated', async (payload) => {
    logger.info({ payload }, 'Booking updated event');
  });

  on('booking.deleted', async (payload) => {
    logger.info({ payload }, 'Booking deleted event');
  });
}
