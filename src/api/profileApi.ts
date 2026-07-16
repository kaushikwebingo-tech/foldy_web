import { client } from './client';

// Profile view + edit. dob/pan/fullName are one-time onboarding inputs (read-only).
// Image applies immediately; email/phone changes are OTP-gated (request-otp →
// verify; applied only when all changed channels verify).
export const profileApi = {
  get: () =>
    client.get('/user/profile'),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return client.post('/user/profile/image', form);
  },

  removeImage: () =>
    client.delete('/user/profile/image'),

  requestContactOtp: (payload: { email?: string; phone?: string }) =>
    client.post('/user/profile/contact/request-otp', payload),

  verifyContactOtp: (payload: { emailOtp?: string; phoneOtp?: string }) =>
    client.post('/user/profile/contact/verify', payload),
};
