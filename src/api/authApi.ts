import { client } from './client';

/*
 * Onboarding (PAN-first) + session helpers.
 * Single entry: panEntry → server returns mode "register" or "login".
 * Registration runs 3 OTP layers: PAN → Phone → Email → create-profile.
 */
export const authApi = {
  // Single entry — register (new PAN) or login (existing PAN).
  panEntry:        (pan: string) =>
    client.post('/onboarding/pan', { pan }),

  // Layer 1 — PAN OTP. Returns registrationToken (register) or token (login).
  verifyPanOtp:    (referenceId: string, otp: string) =>
    client.post('/onboarding/pan/verify-otp', { referenceId, otp }),

  // Layers 2 & 3 — phone / email OTP (registration).
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
