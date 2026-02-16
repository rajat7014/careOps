/**
 * Custom Event Bus
 * 
 * A centralized event bus that provides:
 * - Event emission with validation
 * - Subscription management
 * - Middleware support for cross-cutting concerns
 * - Clean separation between event emission and handling
 */

import { EventEmitter } from 'events';
import { logger } from '../logger.js';
import { Events, validateEventPayload, getEventMetadata } from './registry.js';

class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
    this.middlewares = [];
    this.handlers = new Map();
  }

  /**
   * Register middleware that runs before event handlers
   * @param {(eventName: string, payload: object, next: () => void) => void} middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * Emit an event with validation and middleware support
   * @param {string} eventName - The event name from Events registry
   * @param {object} payload - Event payload
   * @param {object} options - Options { skipValidation: boolean }
   */
  emit(eventName, payload = {}, options = {}) {
    // Validate payload
    if (!options.skipValidation) {
      const isValid = validateEventPayload(eventName, payload);
      if (!isValid) {
        const metadata = getEventMetadata(eventName);
        logger.warn(
          { eventName, payload, expectedFields: metadata?.payload },
          'Event payload validation failed'
        );
      }
    }

    logger.debug({ eventName, payload }, 'Event emitted');

    // Run middlewares
    let index = 0;
    const next = () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        middleware(eventName, payload, next);
      } else {
        // All middlewares passed, emit the event
        this.emitter.emit(eventName, payload);
      }
    };
    next();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - The event name
   * @param {(payload: object) => void | Promise<void>} handler
   * @param {object} options - Options { once: boolean }
   * @returns {() => void} Unsubscribe function
   */
  on(eventName, handler, options = {}) {
    const wrappedHandler = async (payload) => {
      try {
        await handler(payload);
      } catch (err) {
        logger.error({ err, eventName, payload }, 'Event handler error');
        this.emitter.emit('error', err);
      }
    };

    if (options.once) {
      this.emitter.once(eventName, wrappedHandler);
    } else {
      this.emitter.on(eventName, wrappedHandler);
    }

    // Track handlers for cleanup
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName).add(wrappedHandler);

    // Return unsubscribe function
    return () => {
      this.emitter.off(eventName, wrappedHandler);
      this.handlers.get(eventName)?.delete(wrappedHandler);
    };
  }

  /**
   * Subscribe to an event once
   * @param {string} eventName
   * @param {(payload: object) => void | Promise<void>} handler
   * @returns {() => void} Unsubscribe function
   */
  once(eventName, handler) {
    return this.on(eventName, handler, { once: true });
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName
   */
  off(eventName) {
    this.emitter.removeAllListeners(eventName);
    this.handlers.delete(eventName);
  }

  /**
   * Get count of listeners for an event
   * @param {string} eventName
   * @returns {number}
   */
  listenerCount(eventName) {
    return this.emitter.listenerCount(eventName);
  }

  /**
   * Get all registered event names
   * @returns {string[]}
   */
  eventNames() {
    return this.emitter.eventNames();
  }
}

// Singleton instance
const eventBus = new EventBus();

// Global error handler
eventBus.on('error', (err) => {
  logger.error({ err }, 'Unhandled error in event bus');
});

/**
 * Emit a domain event
 * @param {string} eventName
 * @param {object} payload
 * @param {object} options
 */
export function emit(eventName, payload, options) {
  return eventBus.emit(eventName, payload, options);
}

/**
 * Subscribe to a domain event
 * @param {string} eventName
 * @param {(payload: object) => void | Promise<void>} handler
 * @param {object} options
 * @returns {() => void} Unsubscribe function
 */
export function on(eventName, handler, options) {
  return eventBus.on(eventName, handler, options);
}

/**
 * Subscribe to a domain event once
 * @param {string} eventName
 * @param {(payload: object) => void | Promise<void>} handler
 * @returns {() => void} Unsubscribe function
 */
export function once(eventName, handler) {
  return eventBus.once(eventName, handler);
}

export { eventBus, Events };
export default eventBus;
