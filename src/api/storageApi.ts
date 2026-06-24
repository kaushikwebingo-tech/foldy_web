import { client } from './client';

export const storageApi = {
  createFolder:     (name: string) =>
    client.post('/storage/create-folder', { name }),

  uploadFile:       (folderId: string, name: string, size: number, mimeType?: string) =>
    client.post('/storage/upload-file', { folderId, name, size, mimeType }),

  getUsage:         () =>
    client.get('/storage/usage'),

  getInfo:          () =>
    client.get('/storage/info'),

  listFiles:        (folderId?: string, page = 1, pageSize = 10) =>
    client.get('/storage/list-files', { params: { folderId, page, pageSize } }),

  deleteFile:       (fileId: string) =>
    client.delete(`/storage/delete-file/${fileId}`),

  deleteFolder:     (folderId: string) =>
    client.delete(`/storage/delete-folder/${folderId}`),
};
