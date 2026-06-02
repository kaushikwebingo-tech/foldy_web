import { adminClient } from './client';

export const adminApi = {
  login:          (email: string, password: string) =>
    adminClient.post('/auth/login', { email, password }),

  register:       (email: string, password: string, fullName: string) =>
    adminClient.post('/auth/register', { email, password, fullName }),

  getPending:     (page = 1, limit = 10) =>
    adminClient.get('/approve-reject/pending', { params: { page, limit } }),

  approveUser:    (userId: string) =>
    adminClient.post('/approve-reject/approve', { userId }),

  rejectUser:     (userId: string) =>
    adminClient.post('/approve-reject/reject', { userId }),

  listAdmins:     (page = 1, limit = 10, search?: string) =>
    adminClient.get('/admin-users', { params: { page, limit, search } }),
};
