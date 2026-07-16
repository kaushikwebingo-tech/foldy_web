import { client } from './client';

/*
 * ROC / LLP MCA documents — InstaFinancials.
 *
 * One guarded job covers both products: post an identifier and the server picks
 * the stack (CIN/PAN → InstaDocs, LLPIN → LLPDocs), so there is no separate LLP
 * order call. Delivery is asynchronous (webhook), so the flow is:
 *   createJob → poll getJob (free, reads our DB) → getDocuments once ready.
 * Paths match server/src/routes/app/v1/b2b/roc/index.ts.
 */
export const rocApi = {
  /*
   * The only call that spends a vendor credit. One identifier — CIN, PAN or
   * LLPIN — detected server-side. Guarded by one-active-job (409) and the
   * 90-day cooldown (429).
   */
  createJob: (identifier: string) =>
    client.post('/b2b/roc/job', { identifier }),

  /*
   * Current job + cooldown for the logged-in user. Reads our DB — the vendor's
   * status API is budgeted at 4 pulls per order and belongs to the reconciler
   * cron — so this is free to poll. `canOrder` is the flag the button needs.
   */
  getJob: () =>
    client.get('/b2b/roc/job'),

  // Delivered documents (defaults to the latest ready job). Without page/limit
  // the server groups everything by MCA category; with them it returns a flat
  // paginated slice (page 1 also carries categoryCounts) for infinite scroll.
  getDocuments: (params?: { jobId?: string; category?: string; page?: number; limit?: number }) =>
    client.get('/b2b/roc/documents', { params }),

  // Group an InstaDocs/LLPDocs report into the MCA filing categories.
  categorizeDocuments: (report: unknown) =>
    client.post('/b2b/roc/documents/categorize', report),
};
