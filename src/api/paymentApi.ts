import { client } from './client';

export const paymentApi = {
  // Active plans the user can subscribe to (grab a planId from here).
  listPlans:    () =>
    client.get('/payments/plans'),

  // Buy-credit packs. Optionally filter by module (gst | roc | tds | itr | investment).
  listCreditPacks: (module?: string) =>
    client.get('/payments/credit-packs', { params: module ? { module } : undefined }),

  // planId is preferred (a tier can have many plans); planType is a fallback.
  createOrder:  (payload: { planId?: string; planType?: string; amount?: number }) =>
    client.post('/payments/create-order', payload),

  verifyPayment:(data: Record<string, unknown>) =>
    client.post('/payments/verify-payment', data),

  getHistory:   () =>
    client.get('/payments/history'),

  // One transaction from the history list.
  getTransaction: (id: string) =>
    client.get(`/payments/history/${id}`),

  // That transaction's PDF invoice (binary).
  downloadInvoice: (id: string) =>
    client.get(`/payments/history/${id}/invoice`, { responseType: 'blob' }),
};
