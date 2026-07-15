import { client } from './client';

/*
 * LLP (LLP MCA documents) — legacy read-only LlpData records.
 *
 * Ordering LLP documents lives on the ROC module: rocApi.createJob() routes an
 * LLPIN to the LLPDocs stack. That's deliberate — the one-active-job and
 * 90-day-cooldown rules span both products, so a single guarded entry point is
 * the only way to enforce them.
 * Paths match server/src/routes/app/v1/b2b/llp/index.ts.
 */
export const llpApi = {
  listCompanies: () =>
    client.get('/b2b/llp/profiles'),

  getCompany: (llpDataId: string) =>
    client.get(`/b2b/llp/profile/${llpDataId}`),
};
