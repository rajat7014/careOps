import { EventEmitter } from 'events';
import { logger } from '../logger.js';

const appEvents = new EventEmitter();

// Set max listeners per event (default 10)
appEvents.setMaxListeners(50);

appEvents.on('error', (err) => {
  logger.error({ err }, 'Unhandled error in event emitter');
});

/**
 * Emit a domain event. Use for in-process, synchronous event handling.
 * @param {string} eventName - e.g. 'booking.created', 'booking.updated'
 * @param {object} payload - Event payload (workspaceId should be included for multi-tenant)
 */
export function emit(eventName, payload = {}) {
  logger.debug({ eventName, payload }, 'Event emitted');
  appEvents.emit(eventName, payload);
}

/**
 * Subscribe to a domain event.
 * @param {string} eventName
 * @param {(payload: object) => void | Promise<void>} handler
 */
export function on(eventName, handler) {
  appEvents.on(eventName, async (payload) => {
    try {
      await handler(payload);
    } catch (err) {
      logger.error({ err, eventName, payload }, 'Event handler error');
      appEvents.emit('error', err);
    }
  });
}

export { appEvents };
export default appEvents;
