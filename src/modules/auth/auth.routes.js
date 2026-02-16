/**
 * Auth Routes
 * 
 * Authentication and user management routes.
 */

import { Router } from 'express';
import { register, loginUser, addStaff, getMe } from './auth.controller.js';
import { requireAuth, authorizeRole } from '../../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', loginUser);

// Protected routes
router.get('/me', ...requireAuth(), getMe);
router.post('/staff', ...requireAuth(), authorizeRole('OWNER'), addStaff);

export { router as authRoutes };
