import { client } from './client';

/*
 * Compliance health — a single 0-100 score plus the Action Center items behind
 * it (GST late fees, ROC / TDS / ITR status).
 * Backend: server/src/routes/app/v1/complianceRoutes.ts (mounted at
 * /api/v1/compliance, auth only — no segment or module gate).
 */
export const complianceApi = {
  // Score + the actions that drag it down. Computed from data already held, so
  // it makes no provider calls and is safe on a home screen.
  getHealth: () =>
    client.get('/compliance/health'),
};
