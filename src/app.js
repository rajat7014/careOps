import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { requestLogger, errorHandler, notFoundHandler } from './middleware/index.js';
import { authRoutes } from './modules/auth/index.js';
import { onboardingRoutes } from './modules/onboarding/index.js';
import { bookingRoutes } from './modules/booking/index.js';
import { dashboardRoutes } from './modules/dashboard/index.js';
import publicRoutes from './modules/public/public.routes.js';
import inboxRoutes from './modules/inbox/inbox.routes.js';
import contactsRoutes from './modules/contacts/contacts.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import testRoutes from './modules/test/test.routes.js';
import { registerBookingEvents } from './modules/booking/booking.events.js';

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(requestLogger);

const apiRouter = express.Router({ mergeParams: true });

// Public customer-facing routes (no auth required)
apiRouter.use('/public', publicRoutes);

// Auth routes
apiRouter.use('/auth', authRoutes);

// Protected routes (require authentication)
apiRouter.use('/onboarding', onboardingRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/inbox', inboxRoutes);
apiRouter.use('/contacts', contactsRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/staff', staffRoutes);

// Test routes (temporary - remove in production)
apiRouter.use('/test', testRoutes);

app.use(config.server.apiPrefix, apiRouter);

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

// Event registration (workers registered in index.js after Redis connection)
registerBookingEvents();

export default app;
