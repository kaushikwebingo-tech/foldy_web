import { client } from './client';

// Contact Support (common to B2B + B2C).
export const supportApi = {
  // Raise a support request.
  createQuery: (payload: { name: string; email: string; mobile: string; description: string }) =>
    client.post('/support/queries', payload),

  // The logged-in user's own requests, with status + any admin reply.
  listMyQueries: () =>
    client.get('/support/queries'),
};
