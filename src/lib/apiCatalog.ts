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
    description: 'Email/password auth, push-token registration, logout, and the authenticated user\'s plan/storage status. The app\'s primary login is phone-OTP (see Onboarding). Set {{token}} to a logged-in JWT for the protected calls.',
    endpoints: [
      {
        name: 'Register (Email / Password)',
        method: 'POST',
        path: 'api/v1/auth/register',
        description: 'Legacy email+password registration. All fields required (phoneno, email, password ≥ 8, fullName).',
        body: { phoneno: '9876543210', email: 'user@example.com', password: 'password123', fullName: 'John Doe' }
      },
      {
        name: 'Login (Email / Password)',
        method: 'POST',
        path: 'api/v1/auth/login',
        body: { email: 'user@example.com', password: 'password123' }
      },
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
    name: 'Onboarding & KYC',
    description: 'Phone-OTP login + KYC verification (PAN/GSTIN/Bank/Aadhaar via Sandbox) + profile creation + admin-approval request. verify-otp returns the JWT in data.token. Set {{token}} for the authenticated steps.',
    endpoints: [
      {
        name: 'Send OTP',
        method: 'POST',
        path: 'api/v1/onboarding/send-otp',
        description: 'Sends a 6-digit OTP to the phone. (Dev: OTP is printed to the server console.)',
        body: { phoneno: '9876543210' }
      },
      {
        name: 'Verify OTP',
        method: 'POST',
        path: 'api/v1/onboarding/verify-otp',
        description: 'Verifies the OTP and returns the JWT in data.token.',
        body: { phoneno: '9876543210', otp: '123456' }
      },
      {
        name: 'Create / Update Profile',
        method: 'POST',
        path: 'api/v1/onboarding/create-profile',
        description: 'Saves profile + finance details. Required: full_name, email, occupation. KYC numbers optional.',
        body: {
          full_name: 'John Doe',
          email: 'user@example.com',
          occupation: 'Business Owner',
          dob: '01/01/1990',
          pan_no: 'ABCDE1234F',
          gstin_no: GSTIN,
          cin_no: 'U12345MH2020PTC123456',
          tan_no: 'MUMU12345A',
          ifsc_code: 'SBIN0001234',
          account_no: '1234567890',
          adhaar_no: '123456789012'
        }
      },
      {
        name: 'Get Profile Details',
        method: 'GET',
        path: 'api/v1/onboarding/profile-details'
      },
      {
        name: 'Verify PAN',
        method: 'POST',
        path: 'api/v1/onboarding/verify-pan',
        body: { pan_no: 'ABCDE1234F', full_name: 'John Doe', dob: '01/01/1990' }
      },
      {
        name: 'Verify Bank Account',
        method: 'POST',
        path: 'api/v1/onboarding/verify-bank',
        description: 'Penny-less verification — returns the account holder name.',
        body: { ifsc_code: 'SBIN0001234', account_no: '1234567890' }
      },
      {
        name: 'Verify GSTIN',
        method: 'POST',
        path: 'api/v1/onboarding/verify-gstin',
        body: { gstin_no: GSTIN }
      },
      {
        name: 'Aadhaar — Generate OTP',
        method: 'POST',
        path: 'api/v1/onboarding/aadhaar/generate-otp',
        description: 'Triggers an OTP to the Aadhaar-linked mobile. Returns reference_id.',
        body: { aadhaar_number: '123456789012' }
      },
      {
        name: 'Aadhaar — Verify OTP',
        method: 'POST',
        path: 'api/v1/onboarding/aadhaar/verify-otp',
        body: { reference_id: '<reference_id>', otp: '123456' }
      },
      {
        name: 'Add Pending Application Request',
        method: 'POST',
        path: 'api/v1/onboarding/add-request',
        description: 'Creates/resets the admin-approval request for this user.'
      },
      {
        name: 'Check Approval Status',
        method: 'GET',
        path: 'api/v1/onboarding/is-user-allowed'
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
    description: 'GST profile, finance status & taxpayer-session APIs (B2B), powered by WhiteBooks (GSP). Server supplies email/IP/state/txn from env; you pass username, GSTIN & OTP. Note: get-business-info (GSTIN lookup) is pending the WhiteBooks endpoint. Set {{token}}.',
    endpoints: [
      {
        name: 'Get Business Info',
        method: 'POST',
        path: 'api/v1/b2b/gst/get-business-info',
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
        body: { username: '<gst-portal-username>', gstin: GSTIN }
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
