/**
 * Automation Queue
 * 
 * BullMQ queue for automation jobs with:
 * - Delayed job scheduling
 * - Job cancellation by conversationId
 * - Clean separation from event emission
 */

import { getQueue } from './index.js';
import { logger } from '../logger.js';
import { Queues, AutomationJobs } from '../events/registry.js';

const AUTOMATION_QUEUE_NAME = Queues.AUTOMATION;

/**
 * Get the automation queue instance
 * @returns {Queue|null}
 */
export function getAutomationQueue() {
  return getQueue(AUTOMATION_QUEUE_NAME);
}

/**
 * Add a job to the automation queue
 * @param {string} jobName - Job type from AutomationJobs
 * @param {object} data - Job data
 * @param {object} options - BullMQ job options
 * @returns {Promise<Job|null>}
 */
export async function addAutomationJob(jobName, data, options = {}) {
  const queue = getAutomationQueue();
  if (!queue) {
    logger.warn({ jobName, data }, 'Cannot add automation job - Redis unavailable');
    return null;
  }

  try {
    const job = await queue.add(jobName, data, {
      ...options,
      // Store searchable metadata for cancellation
      ...(data.conversationId && {
        jobId: `${data.conversationId}:${jobName}:${Date.now()}`,
      }),
    });

    logger.debug(
      { jobId: job.id, jobName, delay: options.delay },
      'Automation job added'
    );
    return job;
  } catch (err) {
    logger.error({ err, jobName, data }, 'Failed to add automation job');
    return null;
  }
}

/**
 * Schedule a delayed job
 * @param {string} jobName - Job type from AutomationJobs
 * @param {object} data - Job data (must include conversationId for cancellation)
 * @param {number} delayMs - Delay in milliseconds
 * @param {object} options - Additional BullMQ options
 * @returns {Promise<Job|null>}
 */
export async function scheduleDelayedJob(jobName, data, delayMs, options = {}) {
  return addAutomationJob(jobName, data, {
    ...options,
    delay: delayMs,
  });
}

/**
 * Cancel all scheduled jobs for a conversation
 * @param {string} conversationId
 * @returns {Promise<number>} Number of jobs cancelled
 */
export async function cancelScheduledJobsByConversation(conversationId) {
  const queue = getAutomationQueue();
  if (!queue) {
    logger.warn({ conversationId }, 'Cannot cancel jobs - Redis unavailable');
    return 0;
  }

  try {
    // Get all delayed jobs
    const delayedJobs = await queue.getDelayed();
    let cancelledCount = 0;

    for (const job of delayedJobs) {
      // Check if job belongs to this conversation
      if (job.data?.conversationId === conversationId) {
        await job.remove();
        cancelledCount++;
        logger.debug(
          { jobId: job.id, conversationId, jobName: job.name },
          'Cancelled scheduled job'
        );
      }
    }

    if (cancelledCount > 0) {
      logger.info(
        { conversationId, cancelledCount },
        'Cancelled scheduled jobs for conversation'
      );
    }

    return cancelledCount;
  } catch (err) {
    logger.error({ err, conversationId }, 'Failed to cancel scheduled jobs');
    return 0;
  }
}

/**
 * Cancel all scheduled jobs for a booking
 * @param {string} bookingId
 * @returns {Promise<number>} Number of jobs cancelled
 */
export async function cancelScheduledJobsByBooking(bookingId) {
  const queue = getAutomationQueue();
  if (!queue) {
    logger.warn({ bookingId }, 'Cannot cancel jobs - Redis unavailable');
    return 0;
  }

  try {
    const delayedJobs = await queue.getDelayed();
    let cancelledCount = 0;

    for (const job of delayedJobs) {
      if (job.data?.bookingId === bookingId) {
        await job.remove();
        cancelledCount++;
        logger.debug(
          { jobId: job.id, bookingId, jobName: job.name },
          'Cancelled scheduled job'
        );
      }
    }

    if (cancelledCount > 0) {
      logger.info(
        { bookingId, cancelledCount },
        'Cancelled scheduled jobs for booking'
      );
    }

    return cancelledCount;
  } catch (err) {
    logger.error({ err, bookingId }, 'Failed to cancel scheduled jobs');
    return 0;
  }
}

/**
 * Get job counts for monitoring
 * @returns {Promise<object|null>}
 */
export async function getJobCounts() {
  const queue = getAutomationQueue();
  if (!queue) return null;

  try {
    return await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed'
    );
  } catch (err) {
    logger.error({ err }, 'Failed to get job counts');
    return null;
  }
}

/**
 * Booking automation: Send confirmation immediately
 * @param {object} bookingData
 * @param {string} bookingData.bookingId
 * @param {string} bookingData.workspaceId
 * @param {string} bookingData.contactId
 * @param {object} bookingData.booking
 * @returns {Promise<Job|null>}
 */
export async function scheduleBookingConfirmation(bookingData) {
  return addAutomationJob(AutomationJobs.SEND_BOOKING_CONFIRMATION, bookingData);
}

/**
 * Booking automation: Schedule reminder
 * @param {object} bookingData
 * @param {string} bookingData.bookingId
 * @param {string} bookingData.workspaceId
 * @param {string} bookingData.contactId
 * @param {Date} scheduledAt - Booking scheduled time
 * @param {number} reminderHoursBefore - Hours before booking to send reminder (default: 24)
 * @returns {Promise<Job|null>}
 */
export async function scheduleBookingReminder(
  bookingData,
  scheduledAt,
  reminderHoursBefore = 24
) {
  const reminderTime = new Date(scheduledAt);
  reminderTime.setHours(reminderTime.getHours() - reminderHoursBefore);

  const delayMs = reminderTime.getTime() - Date.now();

  // Don't schedule if reminder time has already passed
  if (delayMs <= 0) {
    logger.debug(
      { bookingId: bookingData.bookingId },
      'Reminder time already passed, skipping'
    );
    return null;
  }

  return scheduleDelayedJob(
    AutomationJobs.SEND_BOOKING_REMINDER,
    { ...bookingData, reminderHoursBefore },
    delayMs
  );
}

/**
 * Booking automation: Create form submission record
 * @param {object} data
 * @param {string} data.bookingId
 * @param {string} data.workspaceId
 * @param {string} data.formId
 * @returns {Promise<Job|null>}
 */
export async function scheduleFormSubmissionCreation(data) {
  return addAutomationJob(AutomationJobs.CREATE_FORM_SUBMISSION, data);
}

/**
 * Form automation: Schedule form reminder
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {string} data.formSubmissionId
 * @param {string} data.bookingId
 * @param {string} data.formId
 * @param {string} data.contactId
 * @returns {Promise<Job|null>}
 */
export async function scheduleFormReminder(data) {
  // Schedule reminder for 24 hours from now
  const delayMs = 24 * 60 * 60 * 1000;

  return scheduleDelayedJob(AutomationJobs.SEND_FORM_REMINDER, data, delayMs);
}

/**
 * Form automation: Schedule overdue check
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {string} data.formSubmissionId
 * @param {string} data.bookingId
 * @param {string} data.formId
 * @returns {Promise<Job|null>}
 */
export async function scheduleFormOverdueCheck(data) {
  // Schedule overdue check for 48 hours from now
  const delayMs = 48 * 60 * 60 * 1000;

  return scheduleDelayedJob(AutomationJobs.CHECK_FORM_OVERDUE, data, delayMs);
}
