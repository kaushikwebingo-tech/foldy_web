import { client } from './client';

/*
 * Session, profile and plan helpers for the signed-in person.
 *
 * Signup and sign-in are NOT here: the PAN-first onboarding this file used to
 * drive (/onboarding/pan, its two OTP layers and create-profile) was retired
 * with the server routes, and the live flow lives in identityApi.ts
 * (/signup/* and /auth/login).
 */
export const authApi = {
  // App-side forgot password (distinct from the admin one).
  forgotPassword:  (email: string) =>
    client.post('/auth/forgot-password', { email }),

  // Profile section for the logged-in user (PAN masked).
  getProfile:      () =>
    client.get('/user/profile'),

  // The CALLER's own sessions on the token's account. Owner: rows with no actor.
  // Delegated: only this director's delegated sessions on the company.
  listSessions:    () =>
    client.get('/user/sessions'),

  // Ends one of MY other sessions (same scope as listSessions). 422 for the
  // current sid, 404 for a sid outside my own list. No errorCode on these.
  endSession:      (sid: string) =>
    client.delete(`/user/sessions/${encodeURIComponent(sid)}`),

  // No body: scope is fixed server-side to the caller's actor — an owner never
  // signs out a director, a director only their own other company sessions.
  logoutOtherSessions: () =>
    client.post('/user/sessions/logout-others'),

  // Subscription / trial status (from the user endpoint). Carries memberLimit
  // (owner included, -1 = unlimited) and seatsUsed.
  getTrialStatus:  () =>
    client.get('/user/plan-status'),

  // Storage usage summary (bytes used, folder/file counts vs plan limits).
  getStorageStatus: () =>
    client.get('/user/storage-status'),

  updatePushToken: (notification_token: string, device_type: 'android' | 'ios' | 'web') =>
    client.post('/auth/update-push-token', { notification_token, device_type }),

  logout:          () =>
    client.post('/auth/logout'),

  // Delete Account — soft-deletes the logged-in user (both segments).
  deleteAccount:   () =>
    client.delete('/user/account'),

  // PUBLIC, tokenised "log me out" link emailed on a new-device sign-in. No JWT:
  // it authenticates on the unguessable token in the query string.
  logoutSessionByToken: (token: string) =>
    client.get('/auth/session/logout', { params: { token } }),
};
