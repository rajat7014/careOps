import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';

/**
 * Centralized error handler. Must be registered after all routes.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode ?? err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';

  logger.error(
    {
      err,
      statusCode,
      path: req.path,
      method: req.method,
      workspaceId: req.workspaceId,
    },
    'Request error'
  );

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.env !== 'production' && err.stack && { stack: err.stack }),
    },
  });
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: { message: `Not found: ${req.method} ${req.originalUrl}` },
  });
}
