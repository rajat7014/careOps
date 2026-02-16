import bookingRoutes from './booking.routes.js';
import { registerBookingEvents } from './booking.events.js';

export const routes = bookingRoutes;
export const registerEvents = registerBookingEvents;
export { default as bookingRoutes } from './booking.routes.js';
