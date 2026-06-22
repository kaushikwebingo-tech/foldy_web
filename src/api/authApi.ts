import { client } from './client';

export const authApi = {
  sendOtp:         (phoneno: string) =>
    client.post('/onboarding/send-otp', { phoneno }),

  verifyOtp:       (phoneno: string, otp: string) =>
    client.post('/onboarding/verify-otp', { phoneno, otp }),

  verifyPan:       (pan_no: string, full_name: string, dob: string) =>
    client.post('/onboarding/verify-pan', { pan_no, full_name, dob }),

  verifyGstin:     (gstin_no: string) =>
    client.post('/onboarding/verify-gstin', { gstin_no }),

  verifyBank:      (ifsc_code: string, account_no: string) =>
    client.post('/onboarding/verify-bank', { ifsc_code, account_no }),

  generateAadhaarOtp: (aadhaar_number: string) =>
    client.post('/onboarding/aadhaar/generate-otp', { aadhaar_number }),

  verifyAadhaarOtp: (reference_id: string, otp: string) =>
    client.post('/onboarding/aadhaar/verify-otp', { reference_id, otp }),

  createProfile:   (data: Record<string, unknown>) =>
    client.post('/onboarding/create-profile', data),

  addRequest:      () =>
    client.post('/onboarding/add-request'),

  checkApproval:   () =>
    client.get('/onboarding/is-user-allowed'),

  getTrialStatus:  () =>
    client.get('/trial/status'),

  logout:          () =>
    client.post('/auth/logout'),
};
