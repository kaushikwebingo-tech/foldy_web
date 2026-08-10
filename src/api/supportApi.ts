import { client } from './client';

// Contact Support (common to B2B + B2C) — full ticket thread + attachments.
export const supportApi = {
  // Raise a support request.
  createQuery: (payload: { name: string; email: string; mobile: string; description: string }) =>
    client.post('/support/queries', payload),

  // The logged-in user's own requests, with status + any admin reply.
  listMyQueries: () =>
    client.get('/support/queries'),

  // Total unread admin replies across the user's tickets (for a badge).
  unreadCount: () =>
    client.get('/support/unread-count'),

  // One ticket with its full message thread.
  getQuery: (id: string) =>
    client.get(`/support/queries/${id}`),

  // Add a reply to a ticket. Body: { message }.
  addMessage: (id: string, payload: Record<string, unknown>) =>
    client.post(`/support/queries/${id}/messages`, payload),

  // Mark the ticket's unread admin replies as read.
  markRead: (id: string) =>
    client.patch(`/support/queries/${id}/read`),

  // Rate a resolved ticket. Body: { rating, feedback? }.
  rateQuery: (id: string, payload: Record<string, unknown>) =>
    client.post(`/support/queries/${id}/rating`, payload),

  // Attachments on a ticket (multipart field 'file').
  uploadAttachment: (id: string, form: FormData) =>
    client.post(`/support/queries/${id}/attachments`, form),

  downloadAttachment: (id: string, attachmentId: string) =>
    client.get(`/support/queries/${id}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    }),

  removeAttachment: (id: string, attachmentId: string) =>
    client.delete(`/support/queries/${id}/attachments/${attachmentId}`),
};
