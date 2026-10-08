import { client } from './client';

/*
 * User-account extras that aren't auth or profile-image: the credits wallet,
 * manual data refresh, and compliance reminders. Mirrors /api/v1/user/*.
 */
export const userApi = {
  // ONE pooled wallet for every feature: { wallet, modules: [wallet] }. Two
  // buckets: this cycle's plan allowance (resets, no carryover) + the purchased
  // top-up (never expires); plus lowBalanceAt / confirmAbove thresholds.
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

/*
 * GONE, NOT MISSING — `/user/account-links` (list, link, switch, unlink).
 *
 * Retired deliberately by RBAC_MASTER_PLAN.md §11.2: `AccountLink` was the last
 * remaining way to bind two separate identities into one session group, which is
 * the exact problem the identity redesign exists to remove. The server's four
 * routes, the model, the service and the controller are all deleted, so these
 * four client methods are removed rather than left to 404.
 *
 * The replacement is not a switcher over linked accounts but one person in several
 * workspaces (§5.4): `identityApi.workspaces()` + `identityApi.switchWorkspace()`,
 * which swap the session token inside a single identity.
 */
