import { client } from './client';

/*
 * Income-tax (taxpayer-side) API — ITR list/details + Form 26AS via AuthBridge.
 * Backend: server/src/routes/app/v1/incomeTaxRoutes.ts (mounted at /api/v1/income-tax).
 * PAN is taken from the JWT user; the portal link/OTP is handled server-side.
 */
export const incomeTaxApi = {
  // Is the user's income-tax portal account linked / session live?
  getStatus: () =>
    client.get('/income-tax/itr-client/status'),

  // Link (or re-authenticate) the income-tax portal account.
  linkPortalAccount: (payload: Record<string, unknown> = {}) =>
    client.post('/income-tax/itr-client', payload),

  // Trigger a download of the ITR list (async job on the server).
  downloadItrList: (payload: Record<string, unknown> = {}) =>
    client.post('/income-tax/itr/download', payload),

  // Fetch a specific downloaded ITR's details.
  getItrDetails: (itrId: string) =>
    client.get(`/income-tax/itr/${itrId}`),

  // Trigger a Form 26AS download (async job).
  download26AS: (payload: Record<string, unknown> = {}) =>
    client.post('/income-tax/26as/download', payload),

  // Fetch a specific downloaded 26AS's details.
  get26ASDetails: (tdsId: string) =>
    client.get(`/income-tax/26as/${tdsId}`),
};
