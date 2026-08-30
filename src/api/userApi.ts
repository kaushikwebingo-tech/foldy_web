import { client } from './client';

/*
 * User-account extras that aren't auth or profile-image: the credits wallet,
 * manual data refresh, and compliance reminders. Mirrors /api/v1/user/*.
 */
export const userApi = {
  // Two-bucket wallet per module: this cycle's plan allowance (resets, no
  // carryover) + the purchased top-up (never expires) and the spendable total.
  getCredits: () =>
    client.get('/user/credits'),
  // This user's own credit ledger — allocations, resets, spends, top-ups.
  getCreditHistory: (module?: string, limit?: number) =>
    client.get('/user/credits/history', { params: { ...(module ? { module } : {}), ...(limit ? { limit } : {}) } }),

  // Manually refresh a module's data — spends a credit. `type` is the module
  // key (e.g. gst | roc | tds | itr | investment); optional body varies by module.
  manualRefresh: (type: string, payload: Record<string, unknown> = {}) =>
    client.post(`/user/manualRefresh/${type}`, payload),

  // Compliance reminders surfaced to the user (due/overdue nudges).
  getReminders: () =>
    client.get('/user/reminders'),

  dismissReminder: (id: string) =>
    client.post(`/user/reminders/${id}/dismiss`),
};
