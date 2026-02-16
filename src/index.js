// import app from './app.js';
// import { config } from './config/index.js';
// import { logger } from './lib/logger.js';
// import { getRedis, closeRedis } from './config/redis.js';
// import { closeQueues } from './lib/queue/index.js';
// import { prisma } from './lib/prisma.js';

// // Initialize Redis connection (non-blocking)
// try {
//   getRedis();
// } catch (err) {
//   logger.warn({ err: err.message }, 'Redis initialization failed (queue features disabled)');
// }

// const server = app.listen(config.server.port, () => {
//   logger.info({ port: config.server.port, env: config.env }, 'Server started');
// });

// async function shutdown(signal) {
//   logger.info({ signal }, 'Shutting down');
//   server.close(async () => {
//     try {
//       await closeQueues();
//       await closeRedis();
//       await prisma.$disconnect();
//       logger.info('Shutdown complete');
//       process.exit(0);
//     } catch (err) {
//       logger.error({ err }, 'Shutdown error');
//       process.exit(1);
//     }
//   });
// }

// process.on('SIGTERM', () => shutdown('SIGTERM'));
// process.on('SIGINT', () => shutdown('SIGINT'));


import app from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { getRedis, closeRedis, isRedisAvailable } from './config/redis.js';
import { closeQueues } from './lib/queue/index.js';
import { registerWorkers } from './lib/queue/workers.js';
import { registerAllEventHandlers } from './lib/events/index.js';
import { prisma } from './lib/prisma.js';
import { initializeSendGrid } from './integrations/sendgrid.adapter.js';
import { createTwilioClient } from './integrations/twilio.adapter.js';

let server;

/**
 * Validate critical environment variables
 */
function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check JWT_SECRET (CRITICAL)
  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
    logger.error('JWT_SECRET is required for authentication');
  } else if (process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for security');
  }

  // Check DATABASE_URL (CRITICAL)
  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
    logger.error('DATABASE_URL is required for database connection');
  }

  // Check SendGrid env vars
  if (!process.env.SENDGRID_API_KEY) {
    missing.push('SENDGRID_API_KEY');
  } else if (!process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    warnings.push('SENDGRID_API_KEY does not start with "SG." - may be invalid');
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    missing.push('SENDGRID_FROM_EMAIL');
  }

  // Check Twilio env vars
  if (!process.env.TWILIO_ACCOUNT_SID) {
    missing.push('TWILIO_ACCOUNT_SID');
  } else if (!process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    warnings.push('TWILIO_ACCOUNT_SID does not start with "AC" - may be invalid');
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    missing.push('TWILIO_AUTH_TOKEN');
  }

  if (!process.env.TWILIO_PHONE) {
    missing.push('TWILIO_PHONE');
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn({ warnings }, 'Environment variable warnings');
  }

  // Log missing integration vars (non-critical)
  const integrationMissing = missing.filter(m => 
    ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE'].includes(m)
  );
  
  if (integrationMissing.length > 0) {
    logger.warn(
      { missing: integrationMissing },
      'Missing integration environment variables. Email/SMS features will not work until integrations are configured via onboarding.'
    );
  }

  // Fail on critical missing vars
  const criticalMissing = missing.filter(m => 
    ['JWT_SECRET', 'DATABASE_URL'].includes(m)
  );

  return { missing, warnings, criticalMissing };
}

/**
 * Initialize integration adapters
 */
function initializeIntegrations() {
  const { missing, criticalMissing } = validateEnvironment();

  // Fail startup if critical env vars are missing
  if (criticalMissing.length > 0) {
    logger.fatal(
      { criticalMissing },
      'Critical environment variables missing. Server cannot start.'
    );
    process.exit(1);
  }

  // Initialize SendGrid if API key is present
  if (process.env.SENDGRID_API_KEY) {
    try {
      initializeSendGrid(process.env.SENDGRID_API_KEY);
      logger.info('SendGrid adapter initialized at startup');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize SendGrid adapter');
    }
  }

  // Note: Twilio clients are created per-integration from DB config
  // We don't create a global client since each workspace may have different credentials
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    logger.info('Twilio credentials available - clients will be created per-workspace');
  }

  return missing.length === 0;
}

async function startServer() {
  try {
    // Initialize integrations first
    initializeIntegrations();

    const redis = getRedis();

    logger.info('Waiting for Redis connection...');

    await new Promise((resolve, reject) => {
      redis.once('ready', resolve);
      redis.once('error', reject);
    });

    logger.info('Redis connected and ready');

    // 🔥 REGISTER WORKERS AND EVENT HANDLERS ONLY AFTER REDIS IS READY
    registerWorkers();
    registerAllEventHandlers();
    logger.info('BullMQ workers and event handlers registered');

    server = app.listen(config.server.port, () => {
      logger.info(
        { port: config.server.port, env: config.env, redis: isRedisAvailable() },
        'Server started'
      );
    });

  } catch (err) {
    logger.error({ err }, 'Startup failed');
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');

  if (server) {
    server.close(async () => {
      try {
        await closeQueues();
        await closeRedis();
        await prisma.$disconnect();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Shutdown error');
        process.exit(1);
      }
    });
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
