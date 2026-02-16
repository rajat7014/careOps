import { Router } from 'express';
import * as bookingController from './booking.controller.js';
import { requireAuth, authorizeRole } from '../../middleware/index.js';

const router = Router({ mergeParams: true });

// All booking routes require authentication and workspace context
router.use(...requireAuth());

// STAFF can view and create bookings
router.get('/', bookingController.list);
router.get('/:id', bookingController.getById);
router.post('/', bookingController.create);

// Updates and deletes restricted to OWNER only (STAFF cannot modify system configuration)
router.patch('/:id', authorizeRole('OWNER'), bookingController.update);
router.delete('/:id', authorizeRole('OWNER'), bookingController.remove);

export default router;
