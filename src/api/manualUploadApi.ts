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

  remove: (id: string) =>
    client.delete(`/manual-uploads/items/${id}`),
};
