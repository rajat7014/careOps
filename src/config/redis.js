import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from '../lib/logger.js';

let redisClient = null;
let redisAvailable = false;

export function getRedis() {
  if (!redisClient) {
    // Use REDIS_URL for production (like on Render) or individual config for dev
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      // Use REDIS_URL when available (production environments like Render)
      logger.info(`Attempting to connect to Redis using URL: ${redisUrl.replace(/:[^:@]+@/, ':***@')}`); // Mask password in logs
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: true,
        lazyConnect: true, // Don't connect immediately
        connectTimeout: 5000,
        // Additional options that might help with Render's Redis
        family: 4, // Force IPv4
      });
    } else {
      // Use individual config for development
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: true,
        lazyConnect: true, // Don't connect immediately
        connectTimeout: 5000,
      });
    }

    redisClient.on('connect', () => {
      logger.info('Redis connecting...');
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
      logger.info('Redis connected and ready');
    });

    redisClient.on('error', (err) => {
      redisAvailable = false;
      if (config.env === 'development') {
        logger.warn({ err: err.message }, 'Redis connection error (queue features disabled)');
      } else {
        logger.error({ err }, 'Redis connection error');
      }
    });

    redisClient.on('close', () => {
      redisAvailable = false;
      logger.warn('Redis connection closed');
    });

    // Trigger initial connection (non-blocking). With lazyConnect enabled,
    // this will establish the connection once, and future reconnects are
    // handled by ioredis + retryStrategy. Failures are surfaced only via
    // the event handlers above, so the app won't crash if Redis is down.
    redisClient
      .connect()
      .catch((err) => {
        if (config.env === 'development') {
          logger.debug({ err: err.message }, 'Redis initial connect failed');
        } else {
          logger.warn({ err }, 'Redis initial connect failed');
        }
      });
  }
  return redisClient;
}

export function isRedisAvailable() {
  return redisAvailable;
}

export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (err) {
      logger.warn({ err }, 'Error closing Redis connection');
    }
    redisClient = null;
    redisAvailable = false;
  }
}
