import { client } from './client';

export const paymentApi = {
  createOrder:  (planType: string, amount: number) =>
    client.post('/payments/create-order', { planType, amount }),

  verifyPayment:(data: Record<string, unknown>) =>
    client.post('/payments/verify-payment', data),

  getHistory:   () =>
    client.get('/payments/history'),
};
