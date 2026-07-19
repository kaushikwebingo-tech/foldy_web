import { client } from './client';

// Chat session tokens (common to B2B + B2C).
//
// The privileged chat provider key lives only on the server; this endpoint
// mints a short-lived token scoped to the logged-in user. The uid is taken
// from the JWT, so there's nothing to pass in the body.
export const chatApi = {
  // Mint a chat session for the current user (creates the remote chat user on
  // first call). Safe to call on every login.
  createSession: () =>
    client.post('/chat/session', {}),
};
