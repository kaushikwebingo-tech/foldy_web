import { client } from './client';

/*
 * ROC (company MCA documents) — InstaFinancials InstaDocs.
 * Order lifecycle: place an order (CIN or PAN) → poll status → download report,
 * then categorize the report into the MCA filing categories.
 * Paths match server/src/routes/app/v1/b2b/roc/index.ts.
 */
export const rocApi = {
  // Place an order for a CIN or PAN → returns an orderId.
  placeOrder: (payload: { cin?: string; pan?: string }) =>
    client.post('/b2b/roc/profile', payload),

  // Poll an order's status.
  getOrderStatus: (orderId: string) =>
    client.get(`/b2b/roc/profile/${orderId}/status`),

  // Download the completed report (the raw InstaDocs/LLPDocs JSON).
  downloadReport: (orderId: string) =>
    client.get(`/b2b/roc/profile/${orderId}/download`),

  // The user's saved ROC orders/records.
  listCompanies: () =>
    client.get('/b2b/roc/profiles'),

  getCompany: (rocDataId: string) =>
    client.get(`/b2b/roc/profile/${rocDataId}`),

  // Group an InstaDocs/LLPDocs report into the MCA filing categories.
  categorizeDocuments: (report: unknown) =>
    client.post('/b2b/roc/documents/categorize', report),
};
