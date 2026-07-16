import { client } from './client';

export const paymentApi = {
  // Active plans the user can subscribe to (grab a planId from here).
  listPlans:    () =>
    client.get('/payments/plans'),

  // planId is preferred (a tier can have many plans); planType is a fallback.
  createOrder:  (payload: { planId?: string; planType?: string; amount?: number }) =>
    client.post('/payments/create-order', payload),

  verifyPayment:(data: Record<string, unknown>) =>
    client.post('/payments/verify-payment', data),

  getHistory:   () =>
    client.get('/payments/history'),
};
