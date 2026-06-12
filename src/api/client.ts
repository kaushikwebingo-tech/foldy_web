import axios from 'axios';
import { getToken, getAdminToken, getApiOrigin } from '@/lib/utils';

/*
 * Axios clients for the dev console.
 * baseURL is resolved PER REQUEST from the "API Host" setting (sidebar):
 *   default (empty)  → relative '/api/v1' (Vite proxy → http://localhost:5000)
 *   host set         → '<host>/api/v1' (e.g. production server)
 * so changing the host applies immediately, without a page reload.
 */
const client = axios.create({ baseURL: '/api/v1' });
const adminClient = axios.create({ baseURL: '/api/admin/v1' });

client.interceptors.request.use((config) => {
  config.baseURL = `${getApiOrigin()}/api/v1`;
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminClient.interceptors.request.use((config) => {
  config.baseURL = `${getApiOrigin()}/api/admin/v1`;
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { client, adminClient };
