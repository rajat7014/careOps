/**
 * Events Module
 * 
 * Centralized exports for the event-driven automation system.
 */

// Event bus - main API for emitting and listening to events
export { emit, on, once, eventBus, Events } from './eventBus.js';

// Event registry - constants and metadata
export {
  Events as EventTypes,
  EventMetadata,
  AutomationJobs,
  Queues,
  getEventMetadata,
  validateEventPayload,
} from './registry.js';

// Event handlers - registration functions
export {
  initializeConversationHandlers,
  initializeBookingHandlers,
  initializeFormHandlers,
  registerAllEventHandlers,
} from './handlers/conversationHandlers.js';

// Automation event handlers
export {
  registerAutomationEventHandlers,
} from './handlers/automationHandlers.js';

// Legacy emitter (for backward compatibility)
export { emit as emitLegacy, on as onLegacy, appEvents } from './emitter.js';
