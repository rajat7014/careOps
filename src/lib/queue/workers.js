import { registerWorker, getQueue } from './index.js';
import { logger } from '../logger.js';
import { getAutomationProcessors } from './automationWorker.js';
import { Queues } from '../events/registry.js';
import { registerAutomationEventHandlers } from '../events/handlers/automationHandlers.js';

/**
 * Register all queue workers. Add new processors here.
 * Called AFTER Redis connection is established.
 */
export function registerWorkers() {
  // Booking queue worker
  registerWorker(Queues.BOOKING, {
    onCreated: async (job) => {
      logger.info({ data: job.data }, 'Booking job: onCreated');
      // Placeholder: add automation logic later
    },
  });

  // Automation queue worker
  const automationProcessors = getAutomationProcessors();
  registerWorker(Queues.AUTOMATION, automationProcessors);

  // Ensure queues exist
  getQueue(Queues.BOOKING);
  getQueue(Queues.AUTOMATION);
  getQueue(Queues.NOTIFICATIONS);

  // Register automation event handlers
  registerAutomationEventHandlers();

  logger.info('All BullMQ workers registered');
}
