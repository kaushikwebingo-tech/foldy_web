import axios from 'axios';
import { getToken, getAdminToken } from '@/lib/utils';

const client = axios.create({ baseURL: '/api/v1' });
const adminClient = axios.create({ baseURL: '/api/admin/v1' });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { client, adminClient };
