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

  getProfileDetails: () =>
    client.get('/onboarding/profile-details'),

  updatePushToken: (notification_token: string, device_type: 'android' | 'ios' | 'web') =>
    client.post('/auth/update-push-token', { notification_token, device_type }),

  addRequest:      () =>
    client.post('/onboarding/add-request'),

  checkApproval:   () =>
    client.get('/onboarding/is-user-allowed'),

  // Subscription / trial status. The dedicated /trial route was removed —
  // status now comes from the user endpoint (subscriptionService.getSubscriptionStatus).
  getTrialStatus:  () =>
    client.get('/user/plan-status'),

  logout:          () =>
    client.post('/auth/logout'),
};
