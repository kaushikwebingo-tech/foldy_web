import { client } from './client';

/*
 * App notification centre — the logged-in user's OWN feed (distinct from the
 * admin broadcast side in adminApi). Backend: server/src/routes/app/v1/
 * notificationRoutes.ts (mounted at /api/v1/notifications).
 */
export const notificationsApi = {
  // The user's notifications, newest first.
  list: (page = 1, limit = 20, unreadOnly = false) =>
    client.get('/notifications', { params: { page, limit, unreadOnly } }),

  // Unread badge count.
  unreadCount: () =>
    client.get('/notifications/unread-count'),

  // Mark one as read.
  markRead: (id: string) =>
    client.post(`/notifications/${id}/read`),

  // Mark all as read.
  markAllRead: () =>
    client.post('/notifications/read-all'),

  // Delete one from the feed.
  remove: (id: string) =>
    client.delete(`/notifications/${id}`),
};
