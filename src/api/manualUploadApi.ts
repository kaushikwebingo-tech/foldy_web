import { client } from './client';

/*
 * Manual Uploads API (real multipart file upload → S3).
 * Base: /api/v1/manual-uploads
 */
export const manualUploadApi = {
  getCategories: () =>
    client.get('/manual-uploads/categories'),

  listItems: (category: string, period?: string, frequency?: string) =>
    client.get(`/manual-uploads/${category}/items`, { params: { period, frequency } }),

  upload: (category: string, file: File, period?: string, frequency?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (period) form.append('period', period);
    if (frequency) form.append('frequency', frequency);
    return client.post(`/manual-uploads/${category}/upload`, form);
  },

  download: (id: string) =>
    client.get(`/manual-uploads/items/${id}/download`),

  // Moves to Trash (was a hard delete). Returns { id, holdUntil, purgeAt };
  // holdUntil is null for an owner, now + 7 days for a delegated session.
  remove: (id: string) =>
    client.delete(`/manual-uploads/items/${id}`),

  // Trash, newest deletion first, max 200. Each item carries trashedByName,
  // trashedByOwner and holdUntil (held while holdUntil > now).
  listTrash: () =>
    client.get('/manual-uploads/trash'),

  // Two 409s without an errorCode: a live filing already holds the period, or
  // the purge is racing it. Tell them apart by message.
  restore: (id: string) =>
    client.post(`/manual-uploads/items/${id}/restore`),

  // Owner session only (403 MEMBER_OWNER_ONLY when delegated). Held items are
  // skipped: { deleted, remaining, held, heldUntil }. No listedAt, unlike the vault.
  emptyTrash: () =>
    client.delete('/manual-uploads/trash'),
};
