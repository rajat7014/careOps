import { logger } from '../lib/logger.js';
import { verifyToken, getUserWithWorkspace } from '../modules/auth/auth.service.js';

/**
 * Verify JWT token and attach user info to request
 * @param {object} options
 * @param {boolean} options.optional - If true, don't require token (for public routes)
 */
export function verifyTokenMiddleware(options = {}) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (!token) {
      if (options.optional) {
        return next();
      }
      return res.status(401).json({
        success: false,
        error: { message: 'Authorization required', code: 'TOKEN_MISSING' },
      });
    }

    // Verify JWT
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired token', code: 'TOKEN_INVALID' },
      });
    }

    // Attach token payload to request
    req.tokenPayload = decoded;
    req.userId = decoded.userId;
    req.workspaceId = decoded.workspaceId;
    req.role = decoded.role;

    next();
  };
}

/**
 * Attach full user and workspace context to request
 * Must be used after verifyTokenMiddleware
 */
export function attachWorkspaceContext() {
  return async (req, res, next) => {
    if (!req.userId || !req.workspaceId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'AUTH_REQUIRED' },
      });
    }

    try {
      const context = await getUserWithWorkspace(req.userId, req.workspaceId);

      if (!context) {
        return res.status(403).json({
          success: false,
          error: { message: 'Workspace access denied', code: 'WORKSPACE_ACCESS_DENIED' },
        });
      }

      req.user = context.user;
      req.workspace = context.workspace;
      req.role = context.role;

      next();
    } catch (err) {
      logger.error({ err, userId: req.userId, workspaceId: req.workspaceId }, 'Failed to load workspace context');
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to load user context' },
      });
    }
  };
}

/**
 * Authorize route by role(s)
 * @param {...string} allowedRoles - e.g. 'OWNER', 'STAFF'
 */
export function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.role;

    if (!role || !allowedRoles.includes(role)) {
      logger.warn(
        { role, allowedRoles, path: req.path, userId: req.userId },
        'Forbidden: insufficient role'
      );
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: allowedRoles,
          current: role,
        },
      });
    }
    next();
  };
}

/**
 * Combined auth middleware - verifies token and attaches context
 * Shorthand for: verifyTokenMiddleware(), attachWorkspaceContext()
 */
export function requireAuth() {
  return [verifyTokenMiddleware(), attachWorkspaceContext()];
}

/**
 * Legacy placeholder auth middleware (for backward compatibility)
 * @deprecated Use verifyTokenMiddleware() instead
 */
export function auth(req, res, next) {
  return verifyTokenMiddleware()(req, res, next);
}

/**
 * Legacy requireRole middleware (for backward compatibility)
 * @deprecated Use authorizeRole() instead
 */
export function requireRole(...allowedRoles) {
  return authorizeRole(...allowedRoles);
}
