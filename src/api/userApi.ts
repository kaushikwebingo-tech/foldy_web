import { client } from './client';

/*
 * User-account extras that aren't auth or profile-image: the credits wallet,
 * manual data refresh, and compliance reminders. Mirrors /api/v1/user/*.
 */
export const userApi = {
  // Remaining credits per module for the logged-in user.
  getCredits: () =>
    client.get('/user/credits'),

  // Manually refresh a module's data — spends a credit. `type` is the module
  // key (e.g. gst | roc | tds | itr | itr_26as); optional body varies by module.
  manualRefresh: (type: string, payload: Record<string, unknown> = {}) =>
    client.post(`/user/manualRefresh/${type}`, payload),

  // Compliance reminders surfaced to the user (due/overdue nudges).
  getReminders: () =>
    client.get('/user/reminders'),

  dismissReminder: (id: string) =>
    client.post(`/user/reminders/${id}/dismiss`),
};
