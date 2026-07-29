import { client } from './client';

/*
 * Compliance / events calendar — the user-facing read of the events an admin
 * curates. Backend: server/src/routes/app/v1/calendarRoutes.ts
 * (mounted at /api/v1/calendar). Admin CRUD lives in adminApi (calendar*).
 */
export const calendarApi = {
  // All calendar events (compliance + general), sorted by date/time.
  getEvents: () =>
    client.get('/calendar'),
};
