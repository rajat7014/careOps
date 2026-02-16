/**
 * Auth Controller
 * 
 * Handles HTTP requests for authentication endpoints.
 */

import { registerOwner, login, addStaffUser } from './auth.service.js';
import { logger } from '../../lib/logger.js';

/**
 * Register a new owner and workspace
 * POST /auth/register
 */
export async function register(req, res, next) {
  try {
    const { email, password, name, workspaceName, timezone } = req.body;

    // Validate required fields
    if (!email || !password || !name || !workspaceName) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields: email, password, name, workspaceName',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 8 characters',
          code: 'WEAK_PASSWORD',
        },
      });
    }

    const result = await registerOwner({
      email,
      password,
      name,
      workspaceName,
      timezone,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error({ err }, 'Registration failed');
    
    if (err.message === 'User with this email already exists') {
      return res.status(409).json({
        success: false,
        error: { message: err.message, code: 'USER_EXISTS' },
      });
    }
    
    next(err);
  }
}

/**
 * Login user
 * POST /auth/login
 */
export async function loginUser(req, res, next) {
  try {
    const { email, password, workspaceId } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const result = await login({ email, password, workspaceId });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error({ err }, 'Login failed');
    
    if (err.message === 'Invalid credentials' || err.message === 'No workspace access') {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      });
    }
    
    next(err);
  }
}

/**
 * Add staff user to workspace (OWNER only)
 * POST /auth/staff
 */
export async function addStaff(req, res, next) {
  try {
    const { email, name, password } = req.body;
    const { workspaceId } = req;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and name are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const result = await addStaffUser({
      workspaceId,
      email,
      name,
      password,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error({ err }, 'Add staff failed');
    
    if (err.message === 'User is already a member of this workspace') {
      return res.status(409).json({
        success: false,
        error: { message: err.message, code: 'ALREADY_MEMBER' },
      });
    }
    
    next(err);
  }
}

/**
 * Get current user info
 * GET /auth/me
 */
export async function getMe(req, res) {
  res.json({
    success: true,
    data: {
      user: req.user,
      workspace: req.workspace,
      role: req.role,
    },
  });
}
