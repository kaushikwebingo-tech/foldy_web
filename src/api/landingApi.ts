import axios from 'axios';
import { getApiOrigin } from '@/lib/utils';

/*
 * Public landing-page API — the plan/credit-pack catalog shown before sign-in.
 * Backend: server/src/routes/landing/v1/index.ts.
 *
 * This one does NOT use the shared `client`: the landing routes are mounted at
 * /api/landing/v1 (and mirrored at /landing-page), not /api/v1, and they are
 * PUBLIC — sending a bearer token would be pointless here.
 */
const landingClient = axios.create();

landingClient.interceptors.request.use((config) => {
  config.baseURL = `${getApiOrigin()}/api/landing/v1`;
  return config;
});

export const landingApi = {
  // Overview metadata for landing-page callers.
  getInfo: () =>
    landingClient.get('/'),

  // Active subscription plans + credit packs. Optional workspace filter.
  getPlans: (workspace?: 'business' | 'individual') =>
    landingClient.get('/plans', { params: workspace ? { workspace } : undefined }),
};
