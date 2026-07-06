import { client } from './client';

/*
 * LLP (LLP MCA documents) — InstaFinancials LLPDocs.
 * Order lifecycle: place an order (by LLPIN) → poll status → download report.
 * Reports categorize via the shared ROC categorizer (/b2b/roc/documents/categorize).
 * Paths match server/src/routes/app/v1/b2b/llp/index.ts.
 */
export const llpApi = {
  placeOrder: (llpin: string) =>
    client.post('/b2b/llp/profile', { llpin }),

  getOrderStatus: (orderId: string) =>
    client.get(`/b2b/llp/profile/${orderId}/status`),

  downloadReport: (orderId: string) =>
    client.get(`/b2b/llp/profile/${orderId}/download`),

  listCompanies: () =>
    client.get('/b2b/llp/profiles'),

  getCompany: (llpDataId: string) =>
    client.get(`/b2b/llp/profile/${llpDataId}`),
};
