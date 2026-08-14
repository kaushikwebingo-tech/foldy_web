import { client, adminClient } from './client';

/*
 * Feature Requests — the app's "Suggest Feature" sheet.
 * Backend: server/src/routes/app/v1/featureRequestRoutes.ts (mounted at
 * /api/v1/feature-requests) and routes/admin/v1/adminFeatureRequestRoutes.ts.
 */
export const featureRequestApi = {
  // Allowed titles + labels. The picker is driven by this, and the server
  // validates the submitted title against the same list.
  listOptions: () =>
    client.get('/feature-requests/available'),

  // Submit a suggestion. title must be a value from listOptions().
  submit: (payload: { title: string; description: string }) =>
    client.post('/feature-requests', payload),

  // Admin — every submission, newest first, with the requester populated.
  adminList: (page = 1, limit = 20) =>
    adminClient.get('/feature-requests', { params: { page, limit } }),

  // Admin — same catalog as listOptions(), behind the admin JWT.
  adminListOptions: () =>
    adminClient.get('/feature-requests/available'),
};
