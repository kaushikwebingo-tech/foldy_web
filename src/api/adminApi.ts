import { adminClient } from './client';

export type PlanPayload = {
  planType: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  interval: string;
  storageLimit: number; // bytes
  maxFolders: number;
  maxFilesPerFolder: number;
  isActive?: boolean;
};

export const adminApi = {
  login:          (email: string, password: string) =>
    adminClient.post('/auth/login', { email, password }),

  register:       (email: string, password: string, fullName: string) =>
    adminClient.post('/auth/register', { email, password, fullName }),

  listAdmins:     (page = 1, limit = 10, search?: string) =>
    adminClient.get('/admin-users', { params: { page, limit, search } }),

  // --- Subscription plan catalog (Super Admin) ---
  listPlans:      () =>
    adminClient.get('/plans'),

  createPlan:     (payload: PlanPayload) =>
    adminClient.post('/plans', payload),

  updatePlan:     (id: string, payload: Partial<PlanPayload>) =>
    adminClient.put(`/plans/${id}`, payload),

  setPlanStatus:  (id: string, isActive: boolean) =>
    adminClient.patch(`/plans/${id}/status`, { isActive }),

  // --- Statistics (Super Admin) ---
  getStats:       (activeDays = 30, trendMonths = 6) =>
    adminClient.get('/stats/overview', { params: { activeDays, trendMonths } }),

  getRevenueStats: (trendMonths = 6) =>
    adminClient.get('/stats/revenue', { params: { trendMonths } }),

  // --- Management actions (Super Admin) ---
  listAppUsers:   (page = 1, limit = 10, search?: string) =>
    adminClient.get('/users', { params: { page, limit, search } }),

  getUserDetails: (userId: string) =>
    adminClient.get(`/users/${userId}`),

  blockUser:      (userId: string, reason: string) =>
    adminClient.patch(`/users/${userId}/block`, { reason }),

  unblockUser:    (userId: string, reason?: string) =>
    adminClient.patch(`/users/${userId}/unblock`, { reason }),

  cancelSubscription: (userId: string, reason: string) =>
    adminClient.post(`/users/${userId}/cancel-subscription`, { reason }),

  refundPayment:  (paymentId: string, amount?: number, reason?: string) =>
    adminClient.post(`/payments/${paymentId}/refund`, { amount, reason }),

  listAuditLogs:  (page = 1, limit = 20, action?: string) =>
    adminClient.get('/audit-logs', { params: { page, limit, action } }),
};
