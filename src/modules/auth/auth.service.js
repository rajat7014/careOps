/**
 * Auth Service
 * 
 * Handles user authentication, password hashing, and JWT generation.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';

const SALT_ROUNDS = 12;

/**
 * Hash a password
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 * @param {object} payload
 * @param {string} payload.userId
 * @param {string} payload.workspaceId
 * @param {string} payload.role
 * @returns {string}
 */
export function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Verify JWT token
 * @param {string} token
 * @returns {object|null} Decoded payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    logger.debug({ err }, 'JWT verification failed');
    return null;
  }
}

/**
 * Register a new user and create workspace as OWNER
 * @param {object} data
 * @param {string} data.email
 * @param {string} data.password
 * @param {string} data.name
 * @param {string} data.workspaceName
 * @param {string} data.timezone
 * @returns {Promise<{user: object, workspace: object, token: string}>}
 */
export async function registerOwner(data) {
  const { email, password, name, workspaceName, timezone } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user, workspace, and workspace user in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // Create workspace
    const workspace = await tx.workspace.create({
      data: {
        name: workspaceName,
        slug: generateSlug(workspaceName),
        timezone: timezone || 'UTC',
        isActive: false,
      },
    });

    // Create workspace user as OWNER
    const workspaceUser = await tx.workspaceUser.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    return { user, workspace, workspaceUser };
  });

  // Generate token
  const token = generateToken({
    userId: result.user.id,
    workspaceId: result.workspace.id,
    role: 'OWNER',
  });

  logger.info(
    { userId: result.user.id, workspaceId: result.workspace.id },
    'New owner registered'
  );

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
    workspace: {
      id: result.workspace.id,
      name: result.workspace.name,
      slug: result.workspace.slug,
      isActive: result.workspace.isActive,
    },
    token,
  };
}

/**
 * Login user
 * @param {object} data
 * @param {string} data.email
 * @param {string} data.password
 * @param {string} [data.workspaceId] - Optional specific workspace
 * @returns {Promise<{user: object, workspace: object, token: string}>}
 */
export async function login(data) {
  const { email, password, workspaceId } = data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      workspaceUsers: {
        include: { workspace: true },
      },
    },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Determine workspace and role
  let workspaceUser;
  if (workspaceId) {
    workspaceUser = user.workspaceUsers.find(
      (wu) => wu.workspaceId === workspaceId
    );
  } else {
    // Use first workspace if not specified
    workspaceUser = user.workspaceUsers[0];
  }

  if (!workspaceUser) {
    throw new Error('No workspace access');
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    workspaceId: workspaceUser.workspaceId,
    role: workspaceUser.role,
  });

  logger.info(
    { userId: user.id, workspaceId: workspaceUser.workspaceId },
    'User logged in'
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    workspace: {
      id: workspaceUser.workspace.id,
      name: workspaceUser.workspace.name,
      slug: workspaceUser.workspace.slug,
      isActive: workspaceUser.workspace.isActive,
    },
    token,
  };
}

/**
 * Add staff user to workspace (OWNER only)
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {string} data.email
 * @param {string} data.name
 * @param {string} [data.password] - Optional, generates temp if not provided
 * @returns {Promise<{user: object, workspaceUser: object}>}
 */
export async function addStaffUser(data) {
  const { workspaceId, email, name, password } = data;

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email },
  });

  const tempPassword = password || generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const result = await prisma.$transaction(async (tx) => {
    if (!user) {
      // Create new user
      user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
        },
      });
    }

    // Check if already in workspace
    const existing = await tx.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new Error('User is already a member of this workspace');
    }

    // Add to workspace as STAFF
    const workspaceUser = await tx.workspaceUser.create({
      data: {
        workspaceId,
        userId: user.id,
        role: 'STAFF',
      },
    });

    return { user, workspaceUser };
  });

  logger.info(
    { userId: result.user.id, workspaceId, addedBy: 'OWNER' },
    'Staff user added'
  );

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
    workspaceUser: {
      id: result.workspaceUser.id,
      role: result.workspaceUser.role,
    },
    tempPassword: password ? undefined : tempPassword,
  };
}

/**
 * Get user with workspace context
 * @param {string} userId
 * @param {string} workspaceId
 * @returns {Promise<object|null>}
 */
export async function getUserWithWorkspace(userId, workspaceId) {
  const workspaceUser = await prisma.workspaceUser.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      workspace: true,
    },
  });

  if (!workspaceUser) return null;

  return {
    user: workspaceUser.user,
    workspace: workspaceUser.workspace,
    role: workspaceUser.role,
  };
}

/**
 * Generate URL-friendly slug
 * @param {string} name
 * @returns {string}
 */
function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Generate temporary password
 * @returns {string}
 */
function generateTempPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
