/**
 * Onboarding Service
 * 
 * Handles workspace onboarding flow:
 * 1. Create workspace
 * 2. Connect integration (email or SMS required)
 * 3. Create booking type
 * 4. Define availability
 * 5. Add inventory
 * 6. Add staff users
 * 7. Validate readiness before activation
 * 8. Activate workspace
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { hashPassword } from '../auth/auth.service.js';

/**
 * Validation error for onboarding
 */
export class OnboardingValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'OnboardingValidationError';
    this.details = details;
  }
}

/**
 * Step 1: Create workspace
 * Note: This is typically done during owner registration
 * @param {object} data
 * @param {string} data.name
 * @param {string} data.timezone
 * @param {string} ownerId
 * @returns {Promise<object>}
 */
export async function createWorkspace(data, ownerId) {
  const { name, timezone = 'UTC' } = data;

  const slug = generateSlug(name);

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      timezone,
      isActive: false,
    },
  });

  logger.info({ workspaceId: workspace.id, ownerId }, 'Workspace created during onboarding');

  return workspace;
}

/**
 * Step 2: Connect integration (email or SMS required)
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {string} data.type - 'EMAIL' or 'SMS'
 * @param {string} data.provider - e.g., 'sendgrid', 'twilio'
 * @param {object} data.config - Integration configuration
 * @returns {Promise<object>}
 */
export async function connectIntegration(data) {
  const { workspaceId, type, provider, config } = data;

  if (!['EMAIL', 'SMS'].includes(type)) {
    throw new Error('Integration type must be EMAIL or SMS');
  }

  const integration = await prisma.integration.upsert({
    where: {
      workspaceId_type: {
        workspaceId,
        type,
      },
    },
    update: {
      provider,
      config: JSON.stringify(config),
      isActive: true,
    },
    create: {
      workspaceId,
      type,
      provider,
      config: JSON.stringify(config),
      isActive: true,
    },
  });

  logger.info({ workspaceId, type, provider }, 'Integration connected');

  return integration;
}

/**
 * Step 3: Create booking type
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {string} data.name
 * @param {number} data.duration - Duration in minutes
 * @returns {Promise<object>}
 */
export async function createBookingType(data) {
  const { workspaceId, name, duration } = data;

  const bookingType = await prisma.bookingType.create({
    data: {
      workspaceId,
      name,
      duration,
    },
  });

  logger.info({ workspaceId, bookingTypeId: bookingType.id }, 'Booking type created');

  return bookingType;
}

/**
 * Step 4: Define availability
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {Array<{dayOfWeek: number, startTime: string, endTime: string}>} data.slots
 * @returns {Promise<object[]>}
 */
export async function defineAvailability(data) {
  const { workspaceId, slots } = data;

  // Clear existing availability
  await prisma.availability.deleteMany({
    where: { workspaceId },
  });

  // Create new availability slots
  const availability = await prisma.$transaction(
    slots.map((slot) =>
      prisma.availability.create({
        data: {
          workspaceId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      })
    )
  );

  logger.info({ workspaceId, slotsCount: slots.length }, 'Availability defined');

  return availability;
}

/**
 * Step 5: Add inventory item
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {string} data.name
 * @param {number} data.quantity
 * @param {number} data.threshold
 * @returns {Promise<object>}
 */
export async function addInventory(data) {
  const { workspaceId, name, quantity, threshold } = data;

  const item = await prisma.inventoryItem.create({
    data: {
      workspaceId,
      name,
      quantity,
      threshold,
    },
  });

  logger.info({ workspaceId, itemId: item.id }, 'Inventory item added');

  return item;
}

/**
 * Step 6: Add staff user
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {string} data.email
 * @param {string} data.name
 * @param {string} [data.password]
 * @returns {Promise<object>}
 */
export async function addStaffUser(data) {
  const { workspaceId, email, name, password } = data;

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email },
  });

  const tempPassword = password || generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const result = await prisma.$transaction(async (tx) => {
    if (!user) {
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

    const workspaceUser = await tx.workspaceUser.create({
      data: {
        workspaceId,
        userId: user.id,
        role: 'STAFF',
      },
    });

    return { user, workspaceUser };
  });

  logger.info({ workspaceId, userId: result.user.id }, 'Staff user added during onboarding');

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
    role: result.workspaceUser.role,
    tempPassword: password ? undefined : tempPassword,
  };
}

/**
 * Step 7: Validate readiness before activation
 * Checks:
 * - At least one communication channel connected
 * - At least one booking type exists
 * - Availability defined
 * @param {string} workspaceId
 * @returns {Promise<{valid: boolean, errors: string[], details: object}>}
 */
export async function validateReadiness(workspaceId) {
  const errors = [];
  const details = {};

  // Check communication channel
  const integrations = await prisma.integration.findMany({
    where: { workspaceId, isActive: true },
  });

  const hasEmail = integrations.some((i) => i.type === 'EMAIL');
  const hasSMS = integrations.some((i) => i.type === 'SMS');

  details.communicationChannels = {
    email: hasEmail,
    sms: hasSMS,
    total: integrations.length,
  };

  if (!hasEmail && !hasSMS) {
    errors.push('At least one communication channel (EMAIL or SMS) must be connected');
  }

  // Check booking types
  const bookingTypes = await prisma.bookingType.findMany({
    where: { workspaceId },
  });

  details.bookingTypes = {
    count: bookingTypes.length,
    types: bookingTypes.map((bt) => ({ id: bt.id, name: bt.name })),
  };

  if (bookingTypes.length === 0) {
    errors.push('At least one booking type must be created');
  }

  // Check availability
  const availability = await prisma.availability.findMany({
    where: { workspaceId },
  });

  details.availability = {
    slotsCount: availability.length,
    days: [...new Set(availability.map((a) => a.dayOfWeek))].sort(),
  };

  if (availability.length === 0) {
    errors.push('Availability schedule must be defined');
  }

  // Additional checks (optional but recommended)
  const staffCount = await prisma.workspaceUser.count({
    where: { workspaceId },
  });

  details.staff = {
    count: staffCount,
  };

  return {
    valid: errors.length === 0,
    errors,
    details,
  };
}

/**
 * Step 8: Activate workspace
 * @param {string} workspaceId
 * @returns {Promise<object>}
 */
export async function activateWorkspace(workspaceId) {
  // Validate readiness first
  const readiness = await validateReadiness(workspaceId);

  if (!readiness.valid) {
    throw new OnboardingValidationError(
      'Workspace cannot be activated: validation failed',
      readiness
    );
  }

  // Activate workspace
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { isActive: true },
  });

  logger.info({ workspaceId }, 'Workspace activated');

  return {
    workspace,
    readiness: readiness.details,
  };
}

/**
 * Get onboarding status
 * @param {string} workspaceId
 * @returns {Promise<object>}
 */
export async function getOnboardingStatus(workspaceId) {
  const [
    integrations,
    bookingTypes,
    availability,
    inventory,
    staff,
    workspace,
  ] = await Promise.all([
    prisma.integration.findMany({ where: { workspaceId } }),
    prisma.bookingType.findMany({ where: { workspaceId } }),
    prisma.availability.findMany({ where: { workspaceId } }),
    prisma.inventoryItem.findMany({ where: { workspaceId } }),
    prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
  ]);

  const readiness = await validateReadiness(workspaceId);

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      isActive: workspace.isActive,
    },
    steps: {
      workspaceCreated: !!workspace,
      integrationConnected: integrations.length > 0,
      bookingTypeCreated: bookingTypes.length > 0,
      availabilityDefined: availability.length > 0,
      inventoryAdded: inventory.length > 0,
      staffAdded: staff.length > 1, // More than just owner
    },
    counts: {
      integrations: integrations.length,
      bookingTypes: bookingTypes.length,
      availabilitySlots: availability.length,
      inventoryItems: inventory.length,
      staffMembers: staff.length,
    },
    readiness,
    canActivate: readiness.valid && !workspace.isActive,
  };
}

/**
 * Get workspace integrations
 * @param {string} workspaceId
 * @returns {Promise<object[]>}
 */
export async function getWorkspaceIntegrations(workspaceId) {
  const integrations = await prisma.integration.findMany({
    where: { workspaceId },
    select: {
      id: true,
      type: true,
      provider: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return integrations;
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
