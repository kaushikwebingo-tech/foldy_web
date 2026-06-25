import type { ApiSection } from './postman';

/*
 * Declarative endpoint catalog used to generate Postman collections.
 * Keep paths in sync with the backend routes. Bearer auth + {{baseUrl}} are
 * applied at the collection level by the generator.
 */

const GSTIN = '29ABCDE1234F1Z5';

export const API_SECTIONS: Record<string, ApiSection> = {
  auth: {
    key: 'auth',
    name: 'Auth & Session',
    description: 'Session helpers: push-token registration, logout, and the authenticated user\'s plan/storage status. Login & registration are PAN-first (see Onboarding). Set {{token}} to a logged-in JWT for the protected calls.',
    endpoints: [
      {
        name: 'Forgot Password',
        method: 'POST',
        path: 'api/v1/auth/forgot-password',
        description: 'Always responds success (avoids account enumeration); sends a reset link if the email exists.',
        body: { email: 'user@example.com' }
      },
      {
        name: 'Update Push Token',
        method: 'POST',
        path: 'api/v1/auth/update-push-token',
        description: 'Registers the device push token. Requires auth. device_type = android|ios|web.',
        body: { notification_token: '<fcm-or-onesignal-token>', device_type: 'android' }
      },
      {
        name: 'Logout',
        method: 'POST',
        path: 'api/v1/auth/logout',
        description: 'Revokes the current JWT (token blacklist). Requires auth.'
      },
      {
        name: 'Plan / Subscription Status',
        method: 'GET',
        path: 'api/v1/user/plan-status',
        description: 'Current subscription/trial status + plan limits for the logged-in user.'
      },
      {
        name: 'Storage Status',
        method: 'GET',
        path: 'api/v1/user/storage-status',
        description: 'Storage usage summary for the logged-in user.'
      }
    ]
  },

  onboarding: {
    key: 'onboarding',
    name: 'Onboarding (PAN-first)',
    description: 'Single entry: POST /onboarding/pan handles both registration and login. New PAN → PAN + name + DOB demographic match (Sandbox) → registrationToken; registration then runs 2 OTP layers — Phone → Email — and create-profile returns a JWT. Existing PAN → SMS OTP to the registered mobile, then pan/verify-otp returns the JWT. All OTPs print to the server console in dev.',
    endpoints: [
      {
        name: 'PAN Entry (Register or Login)',
        method: 'POST',
        path: 'api/v1/onboarding/pan',
        description: 'New PAN → demographic match on PAN + name + dob; on success returns mode:"register" + registrationToken + name. Existing PAN → SMS OTP to the registered mobile, returns mode:"login" + referenceId (name/dob ignored).',
        body: { pan: 'ABCDE1234F', name: 'John Doe', dob: '01/01/1990' }
      },
      {
        name: 'Verify OTP & Login (existing PAN)',
        method: 'POST',
        path: 'api/v1/onboarding/pan/verify-otp',
        description: 'Login only: verifies the SMS OTP from PAN Entry and returns { mode:"login", token, user } (JWT).',
        body: { referenceId: '<referenceId>', otp: '123456' }
      },
      {
        name: 'Send OTP — Phone / Email (Layers 1 & 2)',
        method: 'POST',
        path: 'api/v1/onboarding/otp/send',
        description: 'channel = "phone" or "email". Requires the registrationToken from PAN Entry.',
        body: { registrationToken: '<registrationToken>', channel: 'phone', value: '9876543210' }
      },
      {
        name: 'Verify OTP — Phone / Email (Layers 1 & 2)',
        method: 'POST',
        path: 'api/v1/onboarding/otp/verify',
        body: { registrationToken: '<registrationToken>', channel: 'phone', otp: '123456' }
      },
      {
        name: 'Create Profile (auto-login)',
        method: 'POST',
        path: 'api/v1/onboarding/create-profile',
        description: 'Requires Phone + Email verified. Returns { token, user }. name defaults to the identity-matched name.',
        body: { registrationToken: '<registrationToken>', name: 'John Doe' }
      },
      {
        name: 'Get Profile Details',
        method: 'GET',
        path: 'api/v1/onboarding/profile-details',
        description: 'Post-login profile + finance details. Requires {{token}}.'
      }
    ]
  },

  'manual-uploads': {
    key: 'manual-uploads',
    name: 'Manual Uploads',
    description: 'Upload & manage compliance documents (S3-backed). Set {{token}} to a logged-in JWT.',
    endpoints: [
      {
        name: 'List Categories',
        method: 'GET',
        path: 'api/v1/manual-uploads/categories',
        description: 'Categories visible to the logged-in user, with resolved frequencies.'
      },
      {
        name: 'Upload Document',
        method: 'POST',
        path: 'api/v1/manual-uploads/:category/upload',
        description: 'multipart/form-data. period/frequency required for filing categories.',
        pathVars: [{ key: 'category', value: 'pf_esi' }],
        formdata: [
          { key: 'file', type: 'file', description: 'PDF/JPG/PNG/DOCX/XLSX, ≤ 5 MB' },
          { key: 'period', type: 'text', value: '04-2026', description: 'MM-YYYY or YYYY-YY' },
          { key: 'frequency', type: 'text', value: 'monthly', description: 'monthly|annual (only for PTAX)' }
        ]
      },
      {
        name: 'List My Documents',
        method: 'GET',
        path: 'api/v1/manual-uploads/:category/items',
        pathVars: [{ key: 'category', value: 'pf_esi' }],
        query: [
          { key: 'period', value: '04-2026', description: 'optional' },
          { key: 'frequency', value: 'monthly', description: 'optional' }
        ]
      },
      {
        name: 'Get Download Link',
        method: 'GET',
        path: 'api/v1/manual-uploads/items/:id/download',
        pathVars: [{ key: 'id', value: '<documentId>' }]
      },
      {
        name: 'Delete Document',
        method: 'DELETE',
        path: 'api/v1/manual-uploads/items/:id',
        pathVars: [{ key: 'id', value: '<documentId>' }]
      }
    ]
  },

  gst: {
    key: 'gst',
    name: 'GST',
    description: 'GST profiles, finance status & taxpayer-session APIs (B2B), powered by WhiteBooks (GSP). Server supplies email/IP/state/txn from env; you pass username, GSTIN, type & OTP. Set {{token}}.',
    endpoints: [
      {
        name: 'Create GST Profile',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles',
        description: 'Verifies the GSTIN via WhiteBooks then saves a profile. title is the user label; type is auto-filled from the verification; gstUsername (GST portal username) is stored for the later txnId/OTP flow. One profile per (user, GSTIN).',
        body: { gstin: GSTIN, title: 'Head Office', gstUsername: '<gst-portal-username>' }
      },
      {
        name: 'List GST Profiles',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles',
        description: 'All GST profiles saved by the logged-in Business.'
      },
      {
        name: 'Get GST Profile',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Delete GST Profile',
        method: 'DELETE',
        path: 'api/v1/b2b/gst/profiles/:id',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Authorise (Send OTP)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/authorize/otp',
        description: 'Sends the GST-portal OTP using the profile\'s stored GST username + GSTIN.',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Authorise (Verify OTP)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/authorize/verify',
        description: 'Verifies the OTP and persists the 6h taxpayer token on the profile (server-side, auto-refreshed).',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { otp: '123456' }
      },
      {
        name: 'Profile — Session Status',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/session',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Return Summary (stored token)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/summary/:type',
        description: 'Summary using the profile\'s stored token (no taxpayer_token needed). type = gstr1|gstr1a|gstr3b|gstr9|gstr9c; ret_period is MMYYYY.',
        pathVars: [{ key: 'id', value: '<profileId>' }, { key: 'type', value: 'gstr1' }],
        body: { ret_period: '042024' }
      },
      {
        name: 'Get Business Info',
        method: 'POST',
        path: 'api/v1/b2b/gst/get-business-info',
        description: 'Pure WhiteBooks GSTIN lookup (does not create a profile).',
        body: { gstin: GSTIN }
      },
      {
        name: 'Get Finance / Returns Status',
        method: 'POST',
        path: 'api/v1/b2b/gst/get-finance-status',
        body: { gstin: GSTIN, financial_year: 'FY 2024-25', gstr: '' }
      },
      {
        name: 'Taxpayer — Generate OTP',
        method: 'POST',
        path: 'api/v1/b2b/gst/otp',
        description: 'type is required (GSTR1|GSTR3B|GSTR9|GSTR9C|GSTR1A); title is optional.',
        body: { username: '<gst-portal-username>', gstin: GSTIN, type: 'GSTR1', title: 'Q1 filing' }
      },
      {
        name: 'Taxpayer — Verify OTP',
        method: 'POST',
        path: 'api/v1/b2b/gst/otp/verify',
        body: { username: '<gst-portal-username>', gstin: GSTIN, otp: '123456' }
      },
      {
        name: 'Taxpayer — Refresh Session',
        method: 'POST',
        path: 'api/v1/b2b/gst/session/refresh',
        body: { taxpayer_token: '<taxpayer_token>' }
      },
      {
        name: 'GSTR-1 Summary',
        method: 'POST',
        path: 'api/v1/b2b/gst/gstr1/summary',
        body: { taxpayer_token: '<taxpayer_token>', gstin: GSTIN, year: '2024', month: '04', summary_type: 'long' }
      },
      {
        name: 'GSTR-1 B2B Invoices',
        method: 'POST',
        path: 'api/v1/b2b/gst/gstr1/b2b',
        body: { taxpayer_token: '<taxpayer_token>', gstin: GSTIN, year: '2024', month: '04' }
      },
      {
        name: 'Return Summary (by type)',
        method: 'POST',
        path: 'api/v1/b2b/gst/summary/:type',
        description: 'type path var = gstr1|gstr1a|gstr3b|gstr9|gstr9c. ret_period is MMYYYY (year/month optional).',
        pathVars: [{ key: 'type', value: 'gstr1' }],
        body: { taxpayer_token: '<taxpayer_token>', gstin: GSTIN, ret_period: '042024' }
      },
      {
        name: 'Annual Sales Summary',
        method: 'GET',
        path: 'api/v1/b2b/gst/sales-summary',
        query: [
          { key: 'gstin', value: GSTIN },
          { key: 'fy', value: '2024-25' },
          { key: 'taxpayer_token', value: '<taxpayer_token>' }
        ]
      },
      {
        name: 'Mark Return as Filed',
        method: 'POST',
        path: 'api/v1/b2b/gst/mark-as-filed',
        body: { gstin: GSTIN, formType: 'GSTR-1', period: '04-2024' }
      }
    ]
  },

  tds: {
    key: 'tds',
    name: 'TDS',
    description: 'TRACES Form 16 / 16A jobs (B2B). certificate_type is a path variable. Set {{token}}.',
    endpoints: [
      {
        name: 'Submit TDS Job',
        method: 'POST',
        path: 'api/v1/b2b/tds/submit-job/:certificate_type',
        pathVars: [{ key: 'certificate_type', value: 'form16' }],
        body: {
          username: '<traces-username>',
          password: '<traces-password>',
          tan: 'MUMU12345A',
          security_captcha: {
            quarter: 'Q1',
            financial_year: 'FY 2024-25',
            form: '24Q',
            bsr_code: '0000000',
            challan_date: '01/05/2024',
            challan_serial_no: '00001',
            provisional_receipt_number: '000000000000000',
            challan_amount: 10000,
            unique_pan_amount_combination_for_challan: [
              ['sr_no', 'pan', 'total_amount_deposited_against_pan'],
              [1, 'ABCDE1234F', 5000]
            ]
          },
          remember_me: true
        }
      },
      {
        name: 'Poll TDS Job',
        method: 'POST',
        path: 'api/v1/b2b/tds/poll-job/:certificate_type',
        pathVars: [{ key: 'certificate_type', value: 'form16' }],
        body: { job_id: '<job_id>', username: '<traces-username>', password: '<traces-password>', tan: 'MUMU12345A' }
      },
      {
        name: 'Fetch TDS Jobs',
        method: 'POST',
        path: 'api/v1/b2b/tds/fetch-jobs/:certificate_type',
        pathVars: [{ key: 'certificate_type', value: 'form16' }],
        body: { tan: 'MUMU12345A', financial_year: 'FY 2024-25', quarter: 'Q1', form: '24Q', page_size: 10 }
      }
    ]
  },

  digilocker: {
    key: 'digilocker',
    name: 'DigiLocker',
    description: 'DigiLocker KYC — verify, start a consent session, fetch documents. Set {{token}}.',
    endpoints: [
      {
        name: 'Verify Account',
        method: 'POST',
        path: 'api/v1/digilocker/verify-account',
        body: { aadhaar_number: '123456789012', mobile: '9876543210' }
      },
      {
        name: 'Initiate Session',
        method: 'POST',
        path: 'api/v1/digilocker/sessions/init',
        body: { doc_types: ['aadhaar', 'pan'], redirect_url: 'http://localhost:3000/digilocker', flow: 'signin' }
      },
      {
        name: 'Session Status',
        method: 'GET',
        path: 'api/v1/digilocker/sessions/:session_id/status',
        pathVars: [{ key: 'session_id', value: '<session_id>' }]
      },
      {
        name: 'User Profile',
        method: 'GET',
        path: 'api/v1/digilocker/sessions/:session_id/profile',
        pathVars: [{ key: 'session_id', value: '<session_id>' }]
      },
      {
        name: 'Fetch Document',
        method: 'GET',
        path: 'api/v1/digilocker/sessions/:session_id/documents/:doc_type',
        pathVars: [{ key: 'session_id', value: '<session_id>' }, { key: 'doc_type', value: 'aadhaar' }]
      }
    ]
  },

  payments: {
    key: 'payments',
    name: 'Payments',
    description: 'Razorpay order creation + signature verification, payment history. Set {{token}}.',
    endpoints: [
      {
        name: 'List Active Plans',
        method: 'GET',
        path: 'api/v1/payments/plans',
        description: 'Active catalog plans. A tier can have many plans — pick a plan _id to subscribe by planId.'
      },
      {
        name: 'Create Order',
        method: 'POST',
        path: 'api/v1/payments/create-order',
        description: 'Prefer planId (a tier has many plans). planType is a fallback that resolves the cheapest active plan of that tier; amount is a last-resort fallback. Price is server-authoritative from the catalog.',
        body: { planId: '<planId>', amount: 999 }
      },
      {
        name: 'Verify Payment & Upgrade',
        method: 'POST',
        path: 'api/v1/payments/verify-payment',
        description: 'Send planId (preferred) or planType to choose which plan to upgrade to.',
        body: {
          razorpay_order_id: 'order_mock_123',
          razorpay_payment_id: 'pay_mock_123',
          razorpay_signature: 'mock_signature',
          planId: '<planId>'
        }
      },
      {
        name: 'Payment History',
        method: 'GET',
        path: 'api/v1/payments/history'
      }
    ]
  },

  storage: {
    key: 'storage',
    name: 'Documents (Storage)',
    description: 'In-app document vault: folders, files (metadata) & quota. Storage limits come from the subscription plan (no separate storage purchase). Set {{token}}.',
    endpoints: [
      { name: 'Get Storage Info', method: 'GET', path: 'api/v1/storage/info' },
      { name: 'Get Storage Usage', method: 'GET', path: 'api/v1/storage/usage' },
      { name: 'Create Folder', method: 'POST', path: 'api/v1/storage/create-folder', body: { name: 'ITR Documents' } },
      {
        name: 'Upload File (metadata)',
        method: 'POST',
        path: 'api/v1/storage/upload-file',
        body: { folderId: '<folderId>', name: 'document.pdf', size: 1048576, mimeType: 'application/pdf' }
      },
      {
        name: 'List Files',
        method: 'GET',
        path: 'api/v1/storage/list-files',
        query: [
          { key: 'folderId', value: '', description: 'optional' },
          { key: 'page', value: '1' },
          { key: 'pageSize', value: '10' }
        ]
      },
      { name: 'Delete File', method: 'DELETE', path: 'api/v1/storage/delete-file/:fileId', pathVars: [{ key: 'fileId', value: '<fileId>' }] },
      { name: 'Delete Folder', method: 'DELETE', path: 'api/v1/storage/delete-folder/:folderId', pathVars: [{ key: 'folderId', value: '<folderId>' }] }
    ]
  },

  admin: {
    key: 'admin',
    name: 'Admin Panel',
    description: 'Admin auth + admin-user management + Super-Admin plan catalog. Uses the /api/admin/v1 prefix; set {{token}} to an ADMIN JWT.',
    endpoints: [
      { name: 'Admin Register', method: 'POST', path: 'api/admin/v1/auth/register', body: { email: 'admin@foldy.in', password: '<password>', fullName: 'Admin User' } },
      { name: 'Admin Login', method: 'POST', path: 'api/admin/v1/auth/login', body: { email: 'admin@foldy.in', password: '<password>' } },
      {
        name: 'Admin Forgot Password',
        method: 'POST',
        path: 'api/admin/v1/auth/forgot-password',
        description: 'Emails a 6-digit OTP to begin a password reset.',
        body: { email: 'admin@foldy.in' }
      },
      {
        name: 'Admin Verify Email OTP',
        method: 'POST',
        path: 'api/admin/v1/auth/verify-email-otp',
        description: 'Verifies the 6-digit reset OTP.',
        body: { email: 'admin@foldy.in', otp: '123456' }
      },
      {
        name: 'Admin Update Password',
        method: 'POST',
        path: 'api/admin/v1/auth/update-password',
        description: 'Sets a new password (≥ 6 chars) using the verified OTP.',
        body: { email: 'admin@foldy.in', otp: '123456', newPassword: '<new-password>' }
      },
      {
        name: 'Admin Logout',
        method: 'POST',
        path: 'api/admin/v1/auth/logout',
        description: 'Revokes the current admin JWT (token denylist). Requires an admin {{token}}.'
      },
      {
        name: 'List Admin Users',
        method: 'GET',
        path: 'api/admin/v1/admin-users',
        query: [{ key: 'page', value: '1' }, { key: 'limit', value: '10' }, { key: 'search', value: '', description: 'optional' }]
      },
      {
        name: 'List Plans',
        method: 'GET',
        path: 'api/admin/v1/plans',
        description: 'Subscription plan catalog (active + inactive).'
      },
      {
        name: 'Create Plan',
        method: 'POST',
        path: 'api/admin/v1/plans',
        description: 'Multiple plans allowed per tier (planType). price is in ₹; storageLimit in bytes; interval = monthly|quarterly|annual|none.',
        body: {
          planType: 'individual',
          name: 'Individual',
          description: 'For solo professionals.',
          price: 1,
          currency: 'INR',
          interval: 'monthly',
          storageLimit: 10737418240,
          maxFolders: 10,
          maxFilesPerFolder: 20,
          isActive: true
        }
      },
      {
        name: 'Update Plan',
        method: 'PUT',
        path: 'api/admin/v1/plans/:id',
        description: 'Edit price/quotas/details. Bumps version; does NOT affect active subscribers.',
        pathVars: [{ key: 'id', value: '<planId>' }],
        body: { price: 499, name: 'Individual' }
      },
      {
        name: 'Activate / Deactivate Plan',
        method: 'PATCH',
        path: 'api/admin/v1/plans/:id/status',
        pathVars: [{ key: 'id', value: '<planId>' }],
        body: { isActive: false }
      },
      {
        name: 'Statistics Overview',
        method: 'GET',
        path: 'api/admin/v1/stats/overview',
        description: 'Users + subscriptions + revenue + compliance. Live from MongoDB.',
        query: [
          { key: 'activeDays', value: '30', description: 'active-user window (default 30)' },
          { key: 'trendMonths', value: '6', description: 'revenue trend length (default 6)' }
        ]
      },
      {
        name: 'Revenue & Trend',
        method: 'GET',
        path: 'api/admin/v1/stats/revenue',
        description: 'Revenue: gross/refunded/net, by module, last 30 days + monthly trend.',
        query: [{ key: 'trendMonths', value: '6', description: 'default 6' }]
      },
      {
        name: 'List App Users',
        method: 'GET',
        path: 'api/admin/v1/users',
        description: 'App users with block status + subscription summary.',
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '10' },
          { key: 'search', value: '', description: 'phone / email / name (optional)' }
        ]
      },
      {
        name: 'Get User Details',
        method: 'GET',
        path: 'api/admin/v1/users/:userId',
        description: 'Full per-user view: profile, subscription/plan, storage usage (used/available), and recent payments.',
        pathVars: [{ key: 'userId', value: '<userId>' }]
      },
      {
        name: 'Block User',
        method: 'PATCH',
        path: 'api/admin/v1/users/:userId/block',
        description: 'Blocks app access. Audit-logged.',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { reason: 'Fraudulent activity' }
      },
      {
        name: 'Unblock User',
        method: 'PATCH',
        path: 'api/admin/v1/users/:userId/unblock',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { reason: 'Resolved' }
      },
      {
        name: 'Cancel Subscription',
        method: 'POST',
        path: 'api/admin/v1/users/:userId/cancel-subscription',
        description: 'Cancels the user subscription. reason is REQUIRED. Audit-logged.',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { reason: 'Customer requested cancellation' }
      },
      {
        name: 'Process Refund',
        method: 'POST',
        path: 'api/admin/v1/payments/:paymentId/refund',
        description: 'Razorpay refund. Omit amount for full; include ₹ amount for partial. Audit-logged.',
        pathVars: [{ key: 'paymentId', value: '<razorpayPaymentId>' }],
        body: { amount: 499, reason: 'Service issue' }
      },
      {
        name: 'Audit Logs',
        method: 'GET',
        path: 'api/admin/v1/audit-logs',
        description: 'Management action trail (newest first).',
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' },
          { key: 'action', value: '', description: 'block_user|unblock_user|cancel_subscription|refund_payment (optional)' }
        ]
      }
    ]
  }
};

export function getSection(key: string): ApiSection | undefined {
  return API_SECTIONS[key];
}
