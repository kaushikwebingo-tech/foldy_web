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

  // Link (or re-authenticate) the e-filing portal account. Body REQUIRES the
  // portal username (PAN) and password — server: createItrClientSchema.
  linkPortalAccount: (payload: { username: string; password: string }) =>
    client.post('/income-tax/itr-client', payload),

  // Revoke access — delete the stored e-filing portal session. Idempotent.
  unlinkPortalAccount: () =>
    client.delete('/income-tax/itr-client'),

  // Trigger a download of the ITR list (async job). No body — uses the session.
  downloadItrList: () =>
    client.post('/income-tax/itr/download'),

  // Fetch a specific downloaded ITR's details.
  getItrDetails: (itrId: string) =>
    client.get(`/income-tax/itr/${itrId}`),

  // Trigger a Form 26AS download (async job). No body — uses the session.
  download26AS: () =>
    client.post('/income-tax/26as/download'),

  // Fetch a specific downloaded 26AS's details. Optional financialYear query.
  get26ASDetails: (tdsId: string, financialYear?: string) =>
    client.get(`/income-tax/26as/${tdsId}`, {
      params: financialYear ? { financialYear } : {},
    }),

  // Render a Form 26AS / ITR PDF from a stored JSON. itType = '26as' or 'itr-x'
  // (e.g. 'itr-1'). Body carries the S3 `jsonUrl` (validated server-side) plus
  // any template fields. Returns a binary PDF (responseType: 'blob').
  renderPdf: (itType: string, payload: { jsonUrl: string; [k: string]: unknown }) =>
    client.post(`/income-tax/${itType}`, payload, { responseType: 'blob' }),
};
