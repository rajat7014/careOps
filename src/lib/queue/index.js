import { Queue, Worker } from 'bullmq';
import { getRedis, isRedisAvailable } from '../../config/redis.js';
import { config } from '../../config/index.js';
import { logger } from '../logger.js';

const queues = new Map();
const workers = new Map();

const defaultJobOptions = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

/**
 * Get or create a named queue.
 * Returns null if Redis is not available (graceful degradation).
 * @param {string} name - Queue name (e.g. 'booking', 'notifications')
 */
export function getQueue(name) {
  if (!isRedisAvailable()) {
    if (config.env === 'development') {
      logger.debug({ queue: name }, 'Queue unavailable (Redis not connected)');
    }
    return null;
  }

  if (!queues.has(name)) {
    try {
      queues.set(
        name,
        new Queue(name, {
          connection: getRedis(),
          defaultJobOptions,
        })
      );
    } catch (err) {
      logger.error({ err, queue: name }, 'Failed to create queue');
      return null;
    }
  }
  return queues.get(name);
}

/**
 * Register a worker for a queue. Processors receive (job) => Promise.
 * Returns null if Redis is not available (graceful degradation).
 * @param {string} name - Queue name
 * @param {Record<string, (job: Job) => Promise<void>>} processors - Map of job name to handler
 */
export function registerWorker(name, processors) {
  if (!isRedisAvailable()) {
    if (config.env === 'development') {
      logger.debug({ queue: name }, 'Worker registration skipped (Redis not connected)');
    }
    return null;
  }

  if (workers.has(name)) {
    logger.warn({ queue: name }, 'Worker already registered');
    return workers.get(name);
  }

  try {
    const worker = new Worker(
      name,
      async (job) => {
        const handler = processors[job.name];
        if (!handler) {
          logger.warn({ queue: name, jobName: job.name }, 'No processor for job');
          return;
        }
        await handler(job);
      },
      {
        connection: getRedis(),
        concurrency: 5,
      }
    );

    worker.on('completed', (job) => {
      logger.debug({ queue: name, jobId: job.id }, 'Job completed');
    });

    worker.on('failed', (job, err) => {
      logger.error({ err, queue: name, jobId: job?.id }, 'Job failed');
    });

    workers.set(name, worker);
    return worker;
  } catch (err) {
    logger.error({ err, queue: name }, 'Failed to register worker');
    return null;
  }
}

/**
 * Close all queues and workers (for graceful shutdown).
 */
export async function closeQueues() {
  for (const w of workers.values()) {
    await w.close();
  }
  workers.clear();
  queues.clear();
}
