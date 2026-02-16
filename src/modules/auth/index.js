/**
 * Auth Module
 * 
 * Authentication and authorization module exports.
 */

// Routes
export { authRoutes } from './auth.routes.js';

// Service functions
export {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  registerOwner,
  login,
  addStaffUser,
  getUserWithWorkspace,
} from './auth.service.js';

// Controller functions
export {
  register,
  loginUser,
  addStaff,
  getMe,
} from './auth.controller.js';
