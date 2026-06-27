import { client } from './client';

/*
 * Onboarding (PAN-first) + session helpers.
 * Single entry: panEntry → server returns mode "register" or "login".
 *   - New PAN (+ name + DOB) → demographic match → registrationToken.
 *   - Existing PAN → SMS OTP to the registered mobile (login).
 * Registration then runs 2 OTP layers: Phone → Email → create-profile.
 */
export const authApi = {
  // Presence check — is this PAN already registered? (no OTP). Returns { exists, mode }.
  checkPan:        (pan: string) =>
    client.post('/onboarding/pan/check', { pan }),

  // Single entry. Registration needs pan + name + dob (demographic match);
  // login (existing PAN) only needs pan.
  panEntry:        (pan: string, name?: string, dob?: string) =>
    client.post('/onboarding/pan', { pan, ...(name ? { name } : {}), ...(dob ? { dob } : {}) }),

  // Existing-PAN login — verify the SMS OTP. Returns { mode:'login', token, user }.
  verifyPanOtp:    (referenceId: string, otp: string) =>
    client.post('/onboarding/pan/verify-otp', { referenceId, otp }),

  // Layers 1 & 2 — phone / email OTP (registration).
  sendOtp:         (registrationToken: string, channel: 'phone' | 'email', value: string) =>
    client.post('/onboarding/otp/send', { registrationToken, channel, value }),

  verifyOtp:       (registrationToken: string, channel: 'phone' | 'email', otp: string) =>
    client.post('/onboarding/otp/verify', { registrationToken, channel, otp }),

  // Finish registration → JWT (auto-login).
  createProfile:   (registrationToken: string, name?: string) =>
    client.post('/onboarding/create-profile', { registrationToken, ...(name ? { name } : {}) }),

  // Post-login profile read.
  getProfileDetails: () =>
    client.get('/onboarding/profile-details'),

  // Subscription / trial status (from the user endpoint).
  getTrialStatus:  () =>
    client.get('/user/plan-status'),

  updatePushToken: (notification_token: string, device_type: 'android' | 'ios' | 'web') =>
    client.post('/auth/update-push-token', { notification_token, device_type }),

  logout:          () =>
    client.post('/auth/logout'),
};
