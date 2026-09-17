import { client } from './client';

export const paymentApi = {
  // Active plans the user can subscribe to (grab a planId from here).
  listPlans:    () =>
    client.get('/payments/plans'),

  // Buy-credit packs. Optionally filter by module (gst | roc | tds | itr | investment).
  listCreditPacks: (module?: string) =>
    client.get('/payments/credit-packs', { params: module ? { module } : undefined }),

  // Stores what was bought (a PaymentOrder) and prices it from the catalog.
  // Plan: planId preferred, planType falls back to the cheapest active plan of
  // that tier. Credits: purpose 'credits' + packId. `amount` is accepted and
  // IGNORED. Unknown keys are refused (400). A plan whose memberLimit is below
  // seatsUsed is refused before any money moves (409 MEMBER_DOWNGRADE_BLOCKED).
  createOrder:  (payload: {
    purpose?: 'plan' | 'credits';
    planId?: string;
    planType?: string;
    packId?: string;
    module?: string;
    amount?: number;
  }) =>
    client.post('/payments/create-order', payload),

  // Applies the STORED order, exactly once (same path as the webhook). Only the
  // razorpay_* fields are needed; purpose / planId / planType / packId are only
  // COMPARED with the order (a different one → 422 PAYMENT_ORDER_MISMATCH).
  // A replay answers 200 "already applied" and extends nothing.
  verifyPayment:(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    purpose?: string;
    planId?: string;
    planType?: string;
    packId?: string;
  }) =>
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
