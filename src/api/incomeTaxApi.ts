import { client } from './client';

/*
 * Income-tax (taxpayer-side) API — 26AS / AIS / TIS / ITR via AuthBridge.
 * Form 26AS is the B2C "TDS" view (an individual's TDS credits by their PAN).
 * Backend: server/src/routes/app/v1/incomeTaxRoutes.ts (/api/v1/income-tax).
 */
export const incomeTaxApi = {
  // GET /income-tax/26as?financialYear=2024-25  (PAN taken from the JWT user)
  getForm26AS: (financialYear: string) =>
    client.get('/income-tax/26as', { params: { financialYear } }),
};
