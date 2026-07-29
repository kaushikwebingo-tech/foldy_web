import { client } from './client';

/*
 * B2C home / dashboard API — net worth, cash flow, SIP tracker, consent health.
 * Backend: server/src/routes/app/v1/b2c/homeRoutes.ts (mounted at /api/v1/b2c/reports).
 * These power the individual-segment home screen from Account-Aggregator data.
 */
export const homeApi = {
  // The full B2C home payload (summary of everything below).
  getHome: () =>
    client.get('/b2c/reports'),

  // SIP tracker (mutual-fund systematic investments).
  getSip: () =>
    client.get('/b2c/reports/sip'),

  // Net-worth snapshot across linked accounts.
  getNetWorth: () =>
    client.get('/b2c/reports/net-worth'),

  // Cash flow over the last N months (default handled server-side).
  getCashFlow: (months?: number) =>
    client.get('/b2c/reports/cash-flow', { params: months ? { months } : undefined }),

  // Consent health — which linked consents are active / expiring.
  getConsentHealth: () =>
    client.get('/b2c/reports/consents'),
};
