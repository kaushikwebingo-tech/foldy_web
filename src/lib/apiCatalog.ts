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
        name: 'Log Out Session By Token',
        method: 'GET',
        path: 'api/v1/auth/session/logout',
        description: 'PUBLIC, tokenised "log me out" link emailed on a new-device sign-in. Takes NO JWT — it authenticates on the unguessable token in the query string.',
        query: [{ key: 'token', value: '<emailed-token>' }]
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
        name: 'My Profile',
        method: 'GET',
        path: 'api/v1/user/profile',
        description: 'Profile section for the logged-in user: name, dob/incorporation date, email, mobile, PAN (masked to last 4).'
      },
      {
        name: 'Active Sessions',
        method: 'GET',
        path: 'api/v1/user/sessions',
        description: 'Lists the user\'s active device sessions (current flagged). Single-active-session policy keeps this to one.'
      },
      {
        name: 'Log Out Other Devices',
        method: 'POST',
        path: 'api/v1/user/sessions/logout-others',
        description: 'Signs out every device except the current one.'
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
      },
      { name: 'Credits Wallet', method: 'GET', path: 'api/v1/user/credits', description: 'Two-bucket wallet per module: plan allowance for this cycle (planAllowed/planUsed/planRemaining + resetAt, no carryover) plus the purchased topupBalance (never expires) and the spendable `available` total.' },
      { name: 'Credit History', method: 'GET', path: 'api/v1/user/credits/history', description: 'Credit ledger for the logged-in user, newest first — allocate / reset / topup / consume / refund / admin_adjust.', query: [{ key: 'module', value: '', description: 'gst|roc|tds|itr|investment (optional)' }, { key: 'limit', value: '50' }] },
      { name: 'Manual Refresh', method: 'POST', path: 'api/v1/user/manualRefresh/:type', description: 'Re-fetch a module\'s data, spending a credit. type = module key (gst | roc | tds | itr | investment).', pathVars: [{ key: 'type', value: 'gst' }], body: {} },
      { name: 'Reminders', method: 'GET', path: 'api/v1/user/reminders', description: 'Compliance reminders (due/overdue nudges) for the user.' },
      { name: 'Dismiss Reminder', method: 'POST', path: 'api/v1/user/reminders/:id/dismiss', pathVars: [{ key: 'id', value: '<reminderId>' }] }
    ]
  },

  onboarding: {
    key: 'onboarding',
    name: 'Onboarding (PAN-first)',
    description: 'Single entry: POST /onboarding/pan handles both registration and login. New PAN → PAN + name + DOB demographic match (Sandbox) → registrationToken; registration then runs 2 OTP layers — Phone → Email — and create-profile returns a JWT. Existing PAN → SMS OTP to the registered mobile, then pan/verify-otp returns the JWT. All OTPs print to the server console in dev.',
    endpoints: [
      {
        name: 'Check PAN (registered?)',
        method: 'POST',
        path: 'api/v1/onboarding/pan/check',
        description: 'Presence check — is this PAN already registered? Returns { exists, mode } (login | register). No OTP, no side effects.',
        body: { pan: 'ABCDE1234F' }
      },
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
        name: 'Verify via DigiLocker',
        method: 'POST',
        path: 'api/v1/onboarding/digilocker/verify',
        description: 'Identity check via DigiLocker during onboarding. Rate-limited and pre-JWT.',
        body: {}
      },
      {
        name: 'Create Profile (auto-login)',
        method: 'POST',
        path: 'api/v1/onboarding/create-profile',
        description: 'Requires Phone + Email verified. Returns { token, user }. name defaults to the identity-matched name.',
        body: { registrationToken: '<registrationToken>', name: 'John Doe' }
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

  compliance: {
    key: 'compliance',
    name: 'Compliance Health',
    description: 'A single 0-100 compliance score plus the Action Center items behind it (GST late fees, ROC / TDS / ITR status). Auth only — no segment or module gate. Built from data already held, so it makes no provider calls. Set {{token}}.',
    endpoints: [
      { name: 'Compliance Health', method: 'GET', path: 'api/v1/compliance/health', description: 'Score + the actions dragging it down.' }
    ]
  },

  landing: {
    key: 'landing',
    name: 'Landing (Public)',
    description: 'PUBLIC pre-sign-in catalog served from /api/landing/v1 (also mirrored at /landing-page). No bearer token required.',
    endpoints: [
      { name: 'Landing Info', method: 'GET', path: 'api/landing/v1', description: 'Overview metadata for landing-page callers.' },
      { name: 'Landing Plans', method: 'GET', path: 'api/landing/v1/plans', description: 'Active subscription plans + credit packs. Optional workspace filter.', query: [{ key: 'workspace', value: 'business', description: 'business | individual (optional)' }] }
    ]
  },

  webhooks: {
    key: 'webhooks',
    name: 'Webhooks (Provider → Server)',
    description: 'Endpoints PROVIDERS call, mounted at /webhook (outside the /api tree). Each verifies a signature header rather than a JWT, so these are for inspection/replay — not something the app ever calls.',
    endpoints: [
      { name: 'Instafinancials Webhook', method: 'POST', path: 'webhook/instafinancials', description: 'ROC/LLP job callbacks. Verifies X-Webhook-Timestamp + X-Webhook-Signature against the webhook secret.', body: {} },
      { name: 'MoneyOne Webhook', method: 'POST', path: 'webhook/moneyone', description: 'Account-Aggregator consent + FI-data-ready callbacks.', body: {} },
      { name: 'Razorpay Webhook', method: 'POST', path: 'webhook/razorpay', description: 'Payment lifecycle events. Verifies x-razorpay-signature.', body: {} }
    ]
  },

  gst: {
    key: 'gst',
    name: 'GST',
    description: 'GST profiles, finance status & taxpayer-session APIs (B2B), powered by WhiteBooks (GSP). Server supplies email/IP/state/txn from env; you pass username, GSTIN, type & OTP. Set {{token}}.',
    endpoints: [
      {
        name: 'List Filing Alerts',
        method: 'GET',
        path: 'api/v1/b2b/gst/filing-alerts',
        description: 'Returns due today or overdue and still unfiled, most overdue first. Written nightly by gstNotificationCron; the app shows these once a day on first open. Each item carries daysOverdue (0 = due today) and isDueToday. Self-heals: anything since filed is resolved on read.'
      },
      {
        name: 'Dismiss Filing Alert',
        method: 'PATCH',
        path: 'api/v1/b2b/gst/filing-alerts/:id/dismiss',
        description: '"Already filed" — clears one alert. Needed because our filing status only syncs when the user opens a GST screen, so a return filed directly on the GST portal can still show as unfiled.',
        pathVars: [{ key: 'id', value: '<alertId>' }]
      },
      {
        name: 'Create GST Profile',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles',
        description: 'Verifies the GSTIN via WhiteBooks then saves a profile. No title is sent — the server builds it from the business name + an HQ/BR tag (first GSTIN added = "<name> HQ", rest = "<name> BR (<state code>)"). Also sends the GST-portal OTP to the registered mobile so you can authorise immediately (authorize/verify). gstUsername is stored for the session flow. One profile per (user, GSTIN).',
        body: { gstin: GSTIN, gstUsername: '<gst-portal-username>' }
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
        name: 'Profile — Resend OTP',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/authorize/otp',
        description: 'Re-sends the GST-portal OTP for this profile (Create GST Profile already sends the first one).',
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
        name: 'Profile — Set as Primary',
        method: 'PATCH',
        path: 'api/v1/b2b/gst/profiles/:id/primary',
        description: 'Make this saved GSTIN the primary/default profile for the business (a business can hold several).',
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
        name: 'Profile — Return Summary PDF (stored token)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/summary/:type/pdf',
        description: 'The same return summary rendered as a PDF and streamed back as bytes (Content-Disposition: attachment) — nothing is written to disk or S3. type = gstr1|gstr1a|gstr3b|gstr9|gstr9c; ret_period is MMYYYY.',
        pathVars: [{ key: 'id', value: '<profileId>' }, { key: 'type', value: 'gstr1' }],
        body: { ret_period: '042024' }
      },
      {
        name: 'Profile — Sales Summary',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/sales-summary',
        description: 'GSTR-1 sales summary for the profile across a financial year (12-month roll-up), using the stored token. Also syncs filing status as a side effect.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        query: [{ key: 'fy', value: '2025-26', description: 'financial year, e.g. 2025-26' }]
      },
      {
        name: 'Mark Return as Filed',
        method: 'POST',
        path: 'api/v1/b2b/gst/mark-as-filed',
        description: 'Records a return as filed so the reminder cron stops nudging for it. All three fields required; period is MMYYYY.',
        body: { gstin: GSTIN, formType: 'GSTR-1', period: '042026' }
      },
      {
        name: 'Notice List (taxpayer session)',
        method: 'POST',
        path: 'api/v1/b2b/gst/notices/list',
        description: 'Notices via the ACTIVE TAXPAYER SESSION (GSTIN in the body) — distinct from the per-profile GET below, which reads a saved profile by id.',
        body: { gstin: '29ABCDE1234F1Z5', fromDate: '01-04-2024', toDate: '31-03-2025' }
      },
      {
        name: 'Notice Details (taxpayer session)',
        method: 'POST',
        path: 'api/v1/b2b/gst/notices/details',
        description: 'One notice\'s detail via the active taxpayer session.',
        body: { gstin: '29ABCDE1234F1Z5', refId: '<refId>' }
      },
      {
        name: 'Search & Save Taxpayer',
        method: 'POST',
        path: 'api/v1/b2b/gst/profile',
        description: 'Look a taxpayer up by GSTIN and persist it as a profile in one call.',
        body: { gstin: '29ABCDE1234F1Z5' }
      },
      {
        name: 'Set Profile Turnover Band',
        method: 'PATCH',
        path: 'api/v1/b2b/gst/profiles/:id/turnover-band',
        description: 'Sets the turnover band used for late-fee exposure maths.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { turnoverBand: 'upto_1_5_cr' }
      },
      {
        name: 'Profile Notices',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/notices',
        description: 'Notices issued in the ~last 60 days for the profile\'s GSTIN, using its stored token. Optional ?date=DD/MM/YYYY reference day (defaults to today). No taxpayer_token / email needed — injected server-side.',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Notice Details (stored token)',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/notices/:refid',
        description: 'Full detail for one notice — type, tax period, due date of reply, and attached-document metadata. refid comes from the List Notices response.',
        pathVars: [{ key: 'id', value: '<profileId>' }, { key: 'refid', value: '<noticeRefId>' }]
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
  roc: {
    key: 'roc',
    name: 'ROC Documents',
    description: 'Company + LLP MCA documents from InstaFinancials. ONE guarded job drives everything: post an identifier and the server picks the stack (CIN/PAN → InstaDocs, LLPIN → LLPDocs). Delivery is asynchronous and slow (~30 min for LLPDocs, up to ~3 weeks for InstaDocs) and arrives by webhook, so poll GET /job — it reads our DB and costs no vendor call. Guards: one active job per user, and one order per 90 days counted from CREATION. Requires an active B2B plan.',
    endpoints: [
      {
        name: 'Order Documents',
        method: 'POST',
        path: 'api/v1/b2b/roc/job',
        description: 'The only call that spends money. Send ONE identifier: CIN or PAN (→ InstaDocs) or LLPIN (→ LLPDocs) — the type is detected from its shape. cin/pan/llpin are accepted as aliases for `identifier`. `name` is REQUIRED — the company/LLP name as entered by the user, stored on the job and shown on the ROC profile beside the CIN (accepted as `name` or `entityName`). Returns 202 + jobId. Refuses with 409 if a job is already in flight, or 429 while the 90-day cooldown is running.',
        body: { identifier: 'U69202WB2024PTC269500', name: 'ACME Solutions Pvt Ltd' }
      },
      {
        name: 'Job Status',
        method: 'GET',
        path: 'api/v1/b2b/roc/job',
        description: 'The current job + cooldown for the logged-in user. Reads our DB only (the vendor allows just 4 status pulls per order, which the reconciler cron owns), so this is free to poll. `canOrder` is the single flag the order button needs. Key job state off `status` (queued|processing|ready|failed|expired) — `error` is only ever populated on a terminal status (failed|expired), never for a job still running.'
      },
      {
        name: 'My Documents',
        method: 'GET',
        path: 'api/v1/b2b/roc/documents',
        description: 'Documents delivered by the webhook, grouped into the 16 MCA categories. Defaults to the latest ready job. downloadUrl links are permanent InstaFinancials URLs (we store metadata only, no file copy).',
        query: [
          { key: 'jobId', value: '', description: 'optional: a specific job (defaults to the latest ready one)' },
          { key: 'category', value: '', description: 'optional: narrow to one category, e.g. AOC 4' }
        ]
      },
      {
        name: 'Categorize Documents',
        method: 'POST',
        path: 'api/v1/b2b/roc/documents/categorize',
        description: 'Accepts the raw InstaDocs/LLPDocs report ({ ReportData: { InstaDocs|LLPDocs: { Document: [...] } } }), a { report } wrapper, or a bare Document array. Returns all 16 categories in order (empty ones included), each doc trimmed to name/date/size/downloadLink, newest-first.',
        body: {
          ReportData: {
            InstaDocs: {
              Document: [
                {
                  DocumentName: 'AOC-4 XBRL Form AOC-4(XBRL).pdf',
                  DocumentCategory: 'Annual Returns and Balance Sheet eForms',
                  DocumentFillingDate: '02-11-2024',
                  DocumentSize: 7.76,
                  DocumentLink: 'https://downloads.InstaFinancials.com/...'
                },
                {
                  DocumentName: 'Form MGT-7.pdf',
                  DocumentFillingDate: '20-09-2023',
                  DocumentSize: 1.2,
                  DocumentLink: 'https://downloads.InstaFinancials.com/...'
                }
              ]
            }
          }
        }
      },
      {
        name: 'Search Documents',
        method: 'GET',
        path: 'api/v1/b2b/roc/documents/search',
        description: 'Case-insensitive name search across the job\'s delivered documents (server-side — the paged lists never hold the full set). Omit category to search everything; defaults to the latest ready job.',
        query: [
          { key: 'q', value: 'MGT', description: 'search term (min 2 chars)' },
          { key: 'jobId', value: '', description: 'optional: a specific job (defaults to the latest ready one)' },
          { key: 'category', value: '', description: 'optional: scope to one category' },
          { key: 'limit', value: '20', description: 'optional page size' }
        ]
      },
      {
        name: 'MCA Company Master Data',
        method: 'POST',
        path: 'api/v1/b2b/roc/mca/company/master-data',
        description: 'Company/LLP master data from InstaFinancials by CIN or LLPIN (billable). Pass exactly one of cin | llpin.',
        body: { cin: 'U72900KA2021PTC145000' }
      }
    ]
  },

  profile: {
    key: 'profile',
    name: 'Profile',
    description: 'View + edit the logged-in user\'s profile. Name/image update immediately; email/phone changes are OTP-verified (request-otp → verify) and apply only when every changed channel is verified. Set {{token}} to a user JWT.',
    endpoints: [
      {
        name: 'Get Profile',
        method: 'GET',
        path: 'api/v1/user/profile',
        description: 'Name, DOB, email, mobile, masked PAN, and a signed profile-image URL. Name/DOB/PAN are one-time onboarding inputs (read-only).'
      },
      {
        name: 'Upload Profile Image',
        method: 'POST',
        path: 'api/v1/user/profile/image',
        description: 'multipart/form-data; field "image" (jpg/png/webp, ≤5MB). Returns a signed URL.',
        formdata: [{ key: 'image', type: 'file' }]
      },
      {
        name: 'Remove Profile Image',
        method: 'DELETE',
        path: 'api/v1/user/profile/image'
      },
      {
        name: 'Request Contact OTP',
        method: 'POST',
        path: 'api/v1/user/profile/contact/request-otp',
        description: 'Send OTP to the new email and/or phone (only the changed field(s)). Leave one out to keep it unchanged.',
        body: { email: 'new@example.com', phone: '9876543210' }
      },
      {
        name: 'Verify Contact OTP',
        method: 'POST',
        path: 'api/v1/user/profile/contact/verify',
        description: 'Applies the change only when every changed channel is verified; if one is unverified, nothing updates.',
        body: { emailOtp: '123456', phoneOtp: '123456' }
      }
    ]
  },

  support: {
    key: 'support',
    name: 'Support & Account',
    description: 'Contact Support (raise + list own requests), Feature Requests ("Suggest Feature"), and Delete Account — common to both B2B and B2C (auth only). Plus the admin triage endpoints. For the user calls set {{token}} to a user JWT; for the admin calls set {{token}} to an admin JWT.',
    endpoints: [
      {
        name: 'Raise Support Request',
        method: 'POST',
        path: 'api/v1/support/queries',
        description: 'Auto-linked to the logged-in user; starts in status "open".',
        body: { name: 'Jane Doe', email: 'jane@example.com', mobile: '9876543210', description: 'I need help with my subscription.' }
      },
      {
        name: 'My Support Requests',
        method: 'GET',
        path: 'api/v1/support/queries',
        description: 'The logged-in user\'s own requests with status + any admin reply.'
      },
      { name: 'Unread Reply Count', method: 'GET', path: 'api/v1/support/unread-count', description: 'Total unread admin replies across the user\'s tickets (for a badge).' },
      { name: 'Ticket Thread', method: 'GET', path: 'api/v1/support/queries/:id', description: 'One ticket with its full message thread.', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Add Reply', method: 'POST', path: 'api/v1/support/queries/:id/messages', pathVars: [{ key: 'id', value: '<queryId>' }], body: { message: 'Any update on this?' } },
      { name: 'Mark Ticket Read', method: 'PATCH', path: 'api/v1/support/queries/:id/read', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Rate Ticket', method: 'POST', path: 'api/v1/support/queries/:id/rating', pathVars: [{ key: 'id', value: '<queryId>' }], body: { rating: 5, feedback: 'Quick help, thanks!' } },
      { name: 'Upload Attachment', method: 'POST', path: 'api/v1/support/queries/:id/attachments', description: 'multipart, field "file".', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Download Attachment', method: 'GET', path: 'api/v1/support/queries/:id/attachments/:attachmentId/download', pathVars: [{ key: 'id', value: '<queryId>' }, { key: 'attachmentId', value: '<attachmentId>' }] },
      { name: 'Delete Attachment', method: 'DELETE', path: 'api/v1/support/queries/:id/attachments/:attachmentId', pathVars: [{ key: 'id', value: '<queryId>' }, { key: 'attachmentId', value: '<attachmentId>' }] },
      {
        name: 'Delete My Account',
        method: 'DELETE',
        path: 'api/v1/user/account',
        description: 'Soft-deletes the account: revokes sessions, cancels subscription, frees phone/email/PAN for re-registration. Retains the record.'
      },
      {
        name: 'Feature Request Options',
        method: 'GET',
        path: 'api/v1/feature-requests/available',
        description: 'The allowed titles for a feature request, with labels + blurbs. Drives the app\'s "Suggest Feature" picker — call this before submitting.'
      },
      {
        name: 'Submit Feature Request',
        method: 'POST',
        path: 'api/v1/feature-requests',
        description: 'App "Suggest Feature" submission. title MUST be a value from /available (gst | itr | roc | tds | bank_statements | mutual_funds | insurance | epf | other) — anything else is rejected with 400. Auto-linked to the logged-in user; starts in status "pending".',
        body: { title: 'other', description: 'Please add a reminder for advance tax instalments.' }
      },
      {
        name: 'Admin — List Feature Requests',
        method: 'GET',
        path: 'api/admin/v1/feature-requests',
        description: 'Admin JWT. All submitted suggestions, newest first, paginated, with the requesting user populated.',
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' }
        ]
      },
      {
        name: 'Admin — Feature Request Options',
        method: 'GET',
        path: 'api/admin/v1/feature-requests/available',
        description: 'Admin JWT. Same catalog as the user-facing /available, used to label stored title values in the console.'
      },
      {
        name: 'Admin — List Support Queries',
        method: 'GET',
        path: 'api/admin/v1/support/queries',
        description: 'Admin JWT. Filter by status + search, paginated.',
        query: [
          { key: 'status', value: 'open' },
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' }
        ]
      },
      {
        name: 'Admin — Get One Query',
        method: 'GET',
        path: 'api/admin/v1/support/queries/:id',
        description: 'Admin JWT. Full ticket: thread, internal notes, attachments, assignment and metadata.',
        pathVars: [{ key: 'id', value: '<queryId>' }]
      },
      { name: 'Admin — Unread Count', method: 'GET', path: 'api/admin/v1/support/unread-count', description: 'Admin JWT. Tickets with unread user messages (badge count).' },
      { name: 'Admin — Support Stats', method: 'GET', path: 'api/admin/v1/support/stats', description: 'Admin JWT. Queue counts by status / age for the support dashboard.' },
      { name: 'Admin — List Assignees', method: 'GET', path: 'api/admin/v1/support/assignees', description: 'Admin JWT. Admins eligible to own a ticket. Requires the support-assign permission.' },
      { name: 'Admin — Add Response', method: 'POST', path: 'api/admin/v1/support/queries/:id/responses', description: 'Admin JWT. Public reply on the ticket thread — visible to the user.', pathVars: [{ key: 'id', value: '<queryId>' }], body: { message: 'Thanks for reaching out — this is now fixed.' } },
      { name: 'Admin — Add Internal Note', method: 'POST', path: 'api/admin/v1/support/queries/:id/internal-notes', description: 'Admin JWT. Staff-only note. NEVER shown to the user.', pathVars: [{ key: 'id', value: '<queryId>' }], body: { note: 'Reproduced on staging.' } },
      { name: 'Admin — Set Assignee', method: 'PATCH', path: 'api/admin/v1/support/queries/:ticketId/assignee', description: 'Admin JWT. Sets the owning admin outright. Requires the support-assign permission.', pathVars: [{ key: 'ticketId', value: '<queryId>' }], body: { assigneeId: '<adminId>' } },
      { name: 'Admin — Update Assignment', method: 'PATCH', path: 'api/admin/v1/support/queries/:id/assignment', description: 'Admin JWT. Richer assignment payload (owner + team/queue) than Set Assignee.', pathVars: [{ key: 'id', value: '<queryId>' }], body: { assigneeId: '<adminId>', team: 'support' } },
      { name: 'Admin — Update Metadata', method: 'PATCH', path: 'api/admin/v1/support/queries/:id/metadata', description: 'Admin JWT. Tags / priority / category.', pathVars: [{ key: 'id', value: '<queryId>' }], body: { priority: 'high', tags: ['billing'] } },
      { name: 'Admin — Mark Read', method: 'PATCH', path: 'api/admin/v1/support/queries/:id/read', description: 'Admin JWT. Clears the unread badge for this ticket.', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Admin — Archive Query', method: 'PATCH', path: 'api/admin/v1/support/queries/:id/archive', description: 'Admin JWT. Archives the ticket (hidden from the default queue).', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Admin — Upload Attachment', method: 'POST', path: 'api/admin/v1/support/queries/:id/attachments', description: 'Admin JWT. multipart/form-data, field name "file".', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Admin — Download Attachment', method: 'GET', path: 'api/admin/v1/support/queries/:id/attachments/:attachmentId/download', description: 'Admin JWT. Streams the file back.', pathVars: [{ key: 'id', value: '<queryId>' }, { key: 'attachmentId', value: '<attachmentId>' }] },
      { name: 'Admin — Delete Attachment', method: 'DELETE', path: 'api/admin/v1/support/queries/:id/attachments/:attachmentId', description: 'Admin JWT. Requires support.delete.', pathVars: [{ key: 'id', value: '<queryId>' }, { key: 'attachmentId', value: '<attachmentId>' }] },
      { name: 'Admin — List Response Templates', method: 'GET', path: 'api/admin/v1/support/response-templates', description: 'Admin JWT. Canned replies.' },
      { name: 'Admin — Create Response Template', method: 'POST', path: 'api/admin/v1/support/response-templates', description: 'Admin JWT.', body: { title: 'Refund issued', body: 'Your refund has been processed.' } },
      { name: 'Admin — Get Response Template', method: 'GET', path: 'api/admin/v1/support/response-templates/:templateId', description: 'Admin JWT.', pathVars: [{ key: 'templateId', value: '<templateId>' }] },
      { name: 'Admin — Update Response Template', method: 'PATCH', path: 'api/admin/v1/support/response-templates/:templateId', description: 'Admin JWT.', pathVars: [{ key: 'templateId', value: '<templateId>' }], body: { title: 'Updated title' } },
      { name: 'Admin — Delete Response Template', method: 'DELETE', path: 'api/admin/v1/support/response-templates/:templateId', description: 'Admin JWT. Requires support.delete.', pathVars: [{ key: 'templateId', value: '<templateId>' }] },
      { name: 'Admin — Purge Retention', method: 'POST', path: 'api/admin/v1/support/retention/purge', description: 'DESTRUCTIVE. Admin JWT + support.delete. Applies the data-retention policy and deletes expired tickets.', body: {} },
      {
        name: 'Admin — Update Query Status',
        method: 'PATCH',
        path: 'api/admin/v1/support/queries/:id/status',
        description: 'Admin JWT. status = open|in_progress|resolved|closed; response is an optional reply shown to the user.',
        pathVars: [{ key: 'id', value: '<queryId>' }],
        body: { status: 'in_progress', response: 'We are looking into this.' }
      }
    ]
  },

  tds: {
    key: 'tds',
    name: 'TDS',
    description: 'TRACES Form 16 / 16A jobs (B2B): submit returns a jobId immediately and is background-polled server-side; track progress with GET /jobs (no creds). certificate_type (form16|form16a) is a path variable. CONNECT ONCE: save a TdsProfile (see the profile endpoints) and submit/poll/potential-notices may omit username+password — the server decrypts them per call, and the background cron re-resolves them from the profile once the 6h credential cache expires. Also covers "Connect TDS account" (link/read the deductor TAN), TDS "Potential Notices" (async analytics, no TRACES creds), and the TDS Calculator (non-salary + salary/sync synchronous; bulk salary job + poll — no creds, shared B2B + B2C). Set {{token}}.',
    endpoints: [
      {
        name: 'Submit TDS Job',
        method: 'POST',
        path: 'api/v1/b2b/tds/submit-job/:certificate_type',
        description: 'Costs 1 TDS credit. username / password / tan are OPTIONAL: with a saved profile send only security_captcha (plus an optional profileId) and the server resolves the login. Inline credentials still win when present. A job that later fails asynchronously refunds the credit.',
        pathVars: [{ key: 'certificate_type', value: 'form16' }],
        body: {
          profileId: '<optional — omit to use your default profile>',
          username: '<optional when a profile is connected>',
          password: '<optional when a profile is connected>',
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
      },
      {
        name: 'List My TDS Jobs',
        method: 'GET',
        path: 'api/v1/b2b/tds/jobs',
        description: 'Persisted TDS jobs with status + summary (newest first). Low input — the progress tracker / history.',
        query: [
          { key: 'status', value: '', description: 'optional: processing|completed|failed' },
          { key: 'certificate_type', value: '', description: 'optional: form16|form16a' },
          { key: 'kind', value: '', description: 'optional: certificate|potential_notice — certificates and notice analyses share this collection; "certificate" also matches legacy rows with no kind' }
        ]
      },
      {
        name: 'Get TDS Job Status',
        method: 'GET',
        path: 'api/v1/b2b/tds/jobs/:jobId',
        description: 'One job\'s status + summary (no credentials, no TRACES round-trip). Background-polled by the server.',
        pathVars: [{ key: 'jobId', value: '<jobId>' }]
      },
      {
        name: 'Download TDS Certificate',
        method: 'GET',
        path: 'api/v1/b2b/tds/jobs/:jobId/certificate',
        description: 'Streams the completed certificate. The server proxies the provider\'s short-lived URL, so the client never handles it. 404 while TRACES is still preparing the file; 502 if the fetch itself fails.',
        pathVars: [{ key: 'jobId', value: '<jobId>' }]
      },
      {
        name: 'List TDS Profiles',
        method: 'GET',
        path: 'api/v1/b2b/tds/profiles',
        description: 'Saved deductors, default first. Credentials are NEVER returned — each profile reports only hasCredentials: boolean.'
      },
      {
        name: 'Connect TDS Profile',
        method: 'POST',
        path: 'api/v1/b2b/tds/profiles',
        description: '"Connect once": stores the deductor TAN plus an encrypted TRACES username/password. Once a profile exists, submit-job / poll-job / potential-notices may omit username+password entirely. A NEW TAN counts against the plan\'s per-TAN cap; re-connecting an existing one updates it in place.',
        body: { tan: 'MUMB01234F', tracesUsername: '<traces-user>', tracesPassword: '<traces-password>', label: 'Head office' }
      },
      {
        name: 'Get TDS Profile',
        method: 'GET',
        path: 'api/v1/b2b/tds/profiles/:id',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Update TDS Profile',
        method: 'PATCH',
        path: 'api/v1/b2b/tds/profiles/:id',
        description: 'Partial update — send only what changes. Omitting tracesPassword KEEPS the stored one, so a rename cannot wipe a working login.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { label: 'Branch office' }
      },
      {
        name: 'Delete TDS Profile',
        method: 'DELETE',
        path: 'api/v1/b2b/tds/profiles/:id',
        description: 'Removes the profile. If it was the default, the next most recent one is promoted so credential resolution never breaks.',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Set Default TDS Profile',
        method: 'POST',
        path: 'api/v1/b2b/tds/profiles/:id/default',
        description: 'Exactly one profile per user is the default — it is what an omitted profileId resolves to.',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Link TDS TAN (Connect Account)',
        method: 'POST',
        path: 'api/v1/b2b/tds/link-tan',
        description: 'Validate + persist the deductor TAN (no provider verify). Backed by the SAME TdsProfile store as /profiles, so a TAN-only link and a full TRACES login are one record — adding credentials later does not create a second profile. Reused as the default TAN across the certificate + potential-notice flows.',
        body: { tan: 'MUMB01234F' }
      },
      {
        name: 'Get Linked TDS TAN',
        method: 'GET',
        path: 'api/v1/b2b/tds/tan',
        description: 'Returns the deductor TAN linked on the finance profile (low input).'
      },
      {
        name: 'Submit Potential Notice',
        method: 'POST',
        path: 'api/v1/b2b/tds/potential-notices',
        description: 'TDS analytics — "potential notices". Async, no TRACES creds: returns a jobId; the cron polls Sandbox to completion. Costs 1 TDS credit (refunded on failure).',
        body: { tan: 'MUMB01234F', quarter: 'Q1', form: '24Q', financial_year: 'FY 2024-25' }
      },
      {
        name: 'Potential Notice Status',
        method: 'GET',
        path: 'api/v1/b2b/tds/potential-notices',
        description: 'Analysis status + parsed notices for a job (low input — background-polled).',
        query: [{ key: 'job_id', value: '<job_id>' }]
      },
      {
        name: 'Search Potential Notices',
        method: 'POST',
        path: 'api/v1/b2b/tds/potential-notices/search',
        description: 'Sandbox-side search of past potential-notice analyses for this deductor.',
        body: { tan: 'MUMB01234F', quarter: 'Q1', form: '24Q', financial_year: 'FY 2024-25', page_size: 10 }
      },
      {
        name: 'Calculator — Non-Salary TDS',
        method: 'POST',
        path: 'api/v1/b2b/tds/calculator/non-salary',
        description: 'Synchronous TDS on one non-salary payment (no TRACES creds). credit_date is EPOCH ms. Costs 1 TDS credit (refunded on failure). Shared B2B + B2C.',
        body: {
          deductee_type: 'individual',
          is_pan_available: true,
          residential_status: 'resident',
          is_206ab_applicable: false,
          is_pan_operative: true,
          nature_of_payment: 'sales_and_marketing_services',
          credit_amount: 250000,
          credit_date: 1699315200000
        }
      },
      {
        name: 'Calculator — Salary TDS (sync)',
        method: 'POST',
        path: 'api/v1/b2b/tds/calculator/salary/sync',
        description: 'Synchronous TDS on one salary — returns both new- and old-regime figures. financial_year like "FY 2024-25"; salary is a flat {field: value} map. Costs 1 TDS credit (refunded on failure). Shared B2B + B2C.',
        body: {
          financial_year: 'FY 2024-25',
          salary: {
            pan_status: 'PANISVALID',
            employee_category: 'general',
            gross_salary_from_previous_employers: 0,
            tds_by_previous_employers: 0,
            salary_as_per_provisions_contained_in_section_17_1: 750000,
            value_of_perquisites_us_17_2: 0,
            profits_in_lieu_of_salary_us_17_3: 0,
            travel_concession_or_assistance_us_10_5: 0,
            death_cum_retirement_gratuity_us_10_10: 0,
            commuted_value_of_pension_us_10_10_a: 0,
            cash_equivalent_of_leave_salary_encashment_us_10_10_aa: 0,
            house_rent_allowance_us_10_13_a: 0,
            other_special_allowances_under_section_10_14: 0,
            total_amount_of_any_other_exemption_us_10: 0,
            standard_deduction_us_16_ia: 50000,
            entertainment_allowance_us_16_ii: 0,
            tax_on_employment_us_16_iii: 0,
            income_from_house_property_reported_by_employee_offered_for_tds: 346500,
            income_under_the_head_other_sources_offered_for_tds: 0,
            gross_amount_us_80_c: 0,
            deductible_amount_us_80_c: 0,
            gross_amount_us_80_ccc: 0,
            deductible_amount_us_80_ccc: 0,
            gross_amount_us_80_ccd_1: 0,
            deductible_amount_us_80_ccd_1: 0,
            gross_amount_us_80_ccd_1_b: 0,
            deductible_amount_us_80_ccd_1_b: 0,
            gross_amount_us_80_ccd_2: 0,
            deductible_amount_us_80_ccd_2: 0,
            gross_amount_us_80_ccg: 0,
            deductible_amount_us_80_ccg: 0,
            gross_amount_us_80_cch: 0,
            deductible_amount_us_80_cch: 0,
            gross_amount_us_80_d: 0,
            deductible_amount_us_80_d: 0,
            gross_amount_us_80_e: 0,
            deductible_amount_us_80_e: 0,
            gross_amount_us_80_g: 0,
            deductible_amount_us_80_g: 0,
            qualifying_amount_us_80_g: 0,
            gross_amount_us_80_tta: 0,
            deductible_amount_us_80_tta: 0,
            qualifying_amount_us_80_tta: 0,
            gross_amount_for_other_deductions: 0,
            deductible_amount_for_other_deductions: 0,
            qualifying_amount_for_other_deductions: 0
          }
        }
      },
      {
        name: 'Calculator — Salary TDS bulk (submit)',
        method: 'POST',
        path: 'api/v1/b2b/tds/calculator/salary',
        description: 'Submit a bulk salary TDS job — returns a job_id. Same salary body as the sync call; the server uploads the workbook, then poll the job below. Costs 1 TDS credit (refunded on failure).',
        body: {
          financial_year: 'FY 2024-25',
          salary: {
            pan_status: 'PANISVALID',
            employee_category: 'general',
            salary_as_per_provisions_contained_in_section_17_1: 750000,
            standard_deduction_us_16_ia: 50000,
            income_from_house_property_reported_by_employee_offered_for_tds: 346500
          }
        }
      },
      {
        name: 'Calculator — Salary TDS bulk (status)',
        method: 'GET',
        path: 'api/v1/b2b/tds/calculator/salary',
        description: 'Poll a bulk salary TDS job. status: created|queued|succeeded|failed; when succeeded, data.tds_on_salary_workbook_url is the xlsx result. Low input, no charge.',
        query: [{ key: 'job_id', value: '<job_id>' }]
      }
    ]
  },

  digilocker: {
    key: 'digilocker',
    name: 'DigiLocker',
    description: 'DigiLocker KYC — verify, start a consent session, fetch documents. Set {{token}}.',
    endpoints: [
      {
        name: 'OAuth Callback',
        method: 'GET',
        path: 'api/v1/digilocker/callback',
        description: 'PUBLIC OAuth redirect target — DigiLocker/Sandbox sends the BROWSER here. Listed for inspection; the app never calls it directly.',
        query: [{ key: 'code', value: '<oauth-code>' }, { key: 'state', value: '<state>' }]
      },
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
      { name: 'List Credit Packs', method: 'GET', path: 'api/v1/payments/credit-packs', description: 'Buyable credit packs; optional ?module= filter.', query: [{ key: 'module', value: '', description: 'gst|roc|tds|itr|investment (optional)' }] },
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
      },
      {
        name: 'Transaction Details',
        method: 'GET',
        path: 'api/v1/payments/history/:id',
        description: 'One transaction from the history list.',
        pathVars: [{ key: 'id', value: '<transactionId>' }]
      },
      {
        name: 'Download Invoice',
        method: 'GET',
        path: 'api/v1/payments/history/:id/invoice',
        description: 'That transaction\'s PDF invoice (binary).',
        pathVars: [{ key: 'id', value: '<transactionId>' }]
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
        name: 'Update User Module Access',
        method: 'PATCH',
        path: 'api/admin/v1/users/:userId/modules',
        description: 'Toggle per-user module access. Send any subset — omitted flags are left unchanged. A missing flag means ENABLED for that user. Audit-logged; busts the user cache.',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { gst: false, roc: false, tds: true, itr: true, investment: true }
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
      },
      {
        name: 'Broadcast Notification',
        method: 'POST',
        path: 'api/admin/v1/notifications/broadcast',
        description: 'Push to every subscribed device via OneSignal, or to a filtered audience. Recorded in notification history. Omit "filters" entirely to reach everyone (original behaviour). With filters, the server resolves matching user ids and targets those instead.',
        body: { title: 'Scheduled maintenance', message: 'Foldy will be briefly unavailable tonight at 11 PM IST.' }
      },
      {
        name: 'Broadcast to a Targeted Audience',
        method: 'POST',
        path: 'api/admin/v1/notifications/broadcast',
        description: 'Same endpoint, with audience targeting. Filters combine with AND: planTypes (trial|business|individual|enterprise), joinedDaysAgo (signed up EXACTLY N days ago, 0 = today), expiredOnly (subscription expired), workspace (business|individual). Blocked and deleted accounts are always excluded. Errors 400 if no user matches.',
        body: {
          title: 'Your plan has expired',
          message: 'Renew now to keep access to your documents.',
          filters: { planTypes: ['business'], expiredOnly: true }
        }
      },
      {
        name: 'Preview Broadcast Audience',
        method: 'POST',
        path: 'api/admin/v1/notifications/broadcast/preview',
        description: 'Returns { count, summary } — how many users match these filters. Sends nothing. A broadcast cannot be recalled, so check this before sending. An empty filters object counts all eligible users.',
        body: { filters: { planTypes: ['trial'], joinedDaysAgo: 30 } }
      },
      {
        name: 'Send Notification to User',
        method: 'POST',
        path: 'api/admin/v1/notifications/users/:userId',
        description: 'Push to one app user (targets external id = userId, falls back to stored device token).',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { title: 'Your GST return is due', message: 'GSTR-1 for 06-2026 is due in 3 days.' }
      },
      {
        name: 'Notification History',
        method: 'GET',
        path: 'api/admin/v1/notifications',
        description: 'Paginated history of sent notifications (newest first).',
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' },
          { key: 'audience', value: '', description: 'broadcast|user (optional)' }
        ]
      },
      { name: 'List Features', method: 'GET', path: 'api/admin/v1/features', description: 'Feature flags with status (operational | disabled-manual | api-error-auto) + killSwitch — the error-provider kill-switch registry.' },
      { name: 'Create Feature', method: 'POST', path: 'api/admin/v1/features', description: 'redisKey is what the kill-switch middleware reads.', body: { title: 'Whitebooks GST', apiProvider: 'whitebooks', redisKey: 'killswitch:provider:whitebooks-gst', status: 'operational', killSwitch: true, description: '' } },
      { name: 'Toggle Feature (kill-switch)', method: 'PATCH', path: 'api/admin/v1/features/:id/toggle', description: 'REQUIRES a killSwitch body; optionally a status.', pathVars: [{ key: 'id', value: '<featureId>' }], body: { killSwitch: false, status: 'disabled-manual' } },
      { name: 'Update Feature', method: 'PUT', path: 'api/admin/v1/features/:id', pathVars: [{ key: 'id', value: '<featureId>' }], body: { status: 'operational', killSwitch: true } },
      { name: 'Delete Feature', method: 'DELETE', path: 'api/admin/v1/features/:id', pathVars: [{ key: 'id', value: '<featureId>' }] },
      { name: 'List Calendar Events', method: 'GET', path: 'api/admin/v1/calendar', description: 'All events; optional ?month=YYYY-MM.', query: [{ key: 'month', value: '', description: 'YYYY-MM (optional)' }] },
      { name: 'Create Calendar Event', method: 'POST', path: 'api/admin/v1/calendar', body: { title: 'GSTR-1 due', date: '2026-07-11', timeStart: '09:00', timeEnd: '10:00', status: 'pending', eventType: 'compliance' } },
      { name: 'Update Calendar Event', method: 'PUT', path: 'api/admin/v1/calendar/:id', pathVars: [{ key: 'id', value: '<eventId>' }], body: { status: 'approval' } },
      { name: 'Delete Calendar Event', method: 'DELETE', path: 'api/admin/v1/calendar/:id', pathVars: [{ key: 'id', value: '<eventId>' }] },
      { name: 'Bulk Create Calendar Events', method: 'POST', path: 'api/admin/v1/calendar/bulk', body: { events: [{ title: 'GSTR-3B due', date: '2026-07-20' }] } },
      { name: 'Import Previous Year', method: 'POST', path: 'api/admin/v1/calendar/import-previous-year', body: { targetMonth: '2026-07' } },
      { name: 'Credit Costs', method: 'GET', path: 'api/admin/v1/credits/costs', description: 'Per-module credit costs (refresh / download) and their freshness windows.' },
      { name: 'Update Credit Costs', method: 'PUT', path: 'api/admin/v1/credits/costs', description: 'Upserts ONE module+action rule. freshnessMinutes: a repeat refresh inside the window is served free (omit for the module default — GST 360, others 1440; 0 = always refetch).', body: { module: 'gst', action: 'refresh', creditCost: 1, freshnessMinutes: 360, description: '' } },
      { name: 'List Credit Packs (admin)', method: 'GET', path: 'api/admin/v1/credits/packs' },
      { name: 'Create Credit Pack', method: 'POST', path: 'api/admin/v1/credits/packs', body: { name: 'Starter', credits: 100, price: 499, module: 'gst' } },
      { name: 'Update Credit Pack', method: 'PUT', path: 'api/admin/v1/credits/packs/:id', pathVars: [{ key: 'id', value: '<packId>' }], body: { price: 599 } },
      { name: 'User Credits', method: 'GET', path: 'api/admin/v1/credits/users/:userId', description: 'A single user two-bucket wallet, one row per module.', pathVars: [{ key: 'userId', value: '<userId>' }] },
      { name: 'User Credit Ledger', method: 'GET', path: 'api/admin/v1/credits/users/:userId/ledger', description: 'Why that balance is what it is — newest first.', pathVars: [{ key: 'userId', value: '<userId>' }], query: [{ key: 'module', value: '' }, { key: 'limit', value: '50' }] },
      { name: 'Adjust User Credits', method: 'PATCH', path: 'api/admin/v1/credits/users/:userId', description: 'Adjust ONE module. planAllowed/topupBalance set absolute values; delta nudges a bucket (top-up unless bucket says otherwise — top-up survives the next cycle reset). Ledgered as admin_adjust against the acting admin.', pathVars: [{ key: 'userId', value: '<userId>' }], body: { module: 'gst', delta: 50, bucket: 'topup', note: 'Comped after a failed refresh' } },
      // --- Report engine (universal builder). A report is a saved DEFINITION run by the safe, registry-whitelisted engine. Legacy module/reportView reports still supported. ---
      { name: 'Report Data Sources', method: 'GET', path: 'api/admin/v1/reports/data-sources', description: 'Catalog of reportable data sources + their fields/operators (drives the builder AND acts as the query whitelist).' },
      { name: 'Preview Report', method: 'POST', path: 'api/admin/v1/reports/preview', description: 'Run a report DEFINITION live — registry-whitelisted, row/time-capped, Redis-cached 120s. userScopeId scopes the whole report to one user.', body: { definition: { dataSource: 'payments', visualization: 'bar', groupBy: { field: 'module' }, metrics: [{ key: 'm1', label: 'Revenue', agg: 'sum', field: 'amount' }] }, page: 1, noCache: false } },
      { name: 'Export Report CSV', method: 'POST', path: 'api/admin/v1/reports/export', description: 'Cursor-streams matching rows as CSV (cap 50k rows). Body mirrors Preview.', body: { definition: { dataSource: 'users', visualization: 'table', columns: ['fullName', 'email', 'createdAt'] } } },
      { name: 'Create Report', method: 'POST', path: 'api/admin/v1/reports', description: 'Engine: { reportName, definition, published?, userScoped? }. Legacy: { reportName, module, reportView }.', body: { reportName: 'Revenue by module', definition: { dataSource: 'payments', visualization: 'pie', groupBy: { field: 'module' }, metrics: [{ key: 'm1', label: 'Revenue', agg: 'sum', field: 'amount' }] }, published: true, userScoped: false } },
      { name: 'List Reports', method: 'GET', path: 'api/admin/v1/reports', description: 'Saved reports (paged).', query: [{ key: 'search', value: '', description: 'name/description' }, { key: 'module', value: '', description: 'legacy filter' }, { key: 'page', value: '1' }, { key: 'limit', value: '20' }] },
      { name: 'Reports Dashboard (legacy stats)', method: 'GET', path: 'api/admin/v1/reports/dashboard' },
      { name: 'Published Reports', method: 'GET', path: 'api/admin/v1/reports/published', description: 'Every published report + its cached result — the dashboard widget feed.' },
      { name: 'Get Report', method: 'GET', path: 'api/admin/v1/reports/:reportId', description: 'One report + its definition, WITHOUT running it — powers builder edit mode.', pathVars: [{ key: 'reportId', value: '<reportId>' }] },
      { name: 'Report Data', method: 'GET', path: 'api/admin/v1/reports/:reportId/data', description: 'Run a saved report. userScopeId scopes to one user (user-detail analytics).', pathVars: [{ key: 'reportId', value: '<reportId>' }], query: [{ key: 'userScopeId', value: '', description: 'optional user id' }, { key: 'page', value: '1' }, { key: 'noCache', value: 'false' }] },
      { name: 'Update Report', method: 'PATCH', path: 'api/admin/v1/reports/:reportId', description: 'Partial update: reportName / description / definition / published / userScoped.', pathVars: [{ key: 'reportId', value: '<reportId>' }], body: { published: true } },
      { name: 'Delete Report', method: 'DELETE', path: 'api/admin/v1/reports/:reportId', pathVars: [{ key: 'reportId', value: '<reportId>' }] },
      { name: 'Create Saved Search', method: 'POST', path: 'api/admin/v1/saved-searches', body: { name: 'Expiring trials', query: {} } },
      { name: 'List Saved Searches', method: 'GET', path: 'api/admin/v1/saved-searches' },
      { name: 'Get Saved Search', method: 'GET', path: 'api/admin/v1/saved-searches/:savedSearchId', pathVars: [{ key: 'savedSearchId', value: '<id>' }] },
      { name: 'Update Saved Search', method: 'PATCH', path: 'api/admin/v1/saved-searches/:savedSearchId', pathVars: [{ key: 'savedSearchId', value: '<id>' }], body: { name: 'Renamed' } },
      { name: 'Delete Saved Search', method: 'DELETE', path: 'api/admin/v1/saved-searches/:savedSearchId', pathVars: [{ key: 'savedSearchId', value: '<id>' }] },
      { name: 'Execute Saved Search', method: 'POST', path: 'api/admin/v1/saved-searches/:savedSearchId/execute', pathVars: [{ key: 'savedSearchId', value: '<id>' }] },
      { name: 'Cron Status', method: 'GET', path: 'api/admin/v1/crons/status' },
      { name: 'Cron Runs', method: 'GET', path: 'api/admin/v1/crons/runs' },
      { name: 'Cron Run Detail', method: 'GET', path: 'api/admin/v1/crons/runs/:id', pathVars: [{ key: 'id', value: '<runId>' }] },
      { name: 'Run Cron Now', method: 'POST', path: 'api/admin/v1/crons/:name/run', pathVars: [{ key: 'name', value: 'complianceStatsCron' }] },
      { name: 'Search Users', method: 'POST', path: 'api/admin/v1/users/search', body: { query: '', filters: {} } },
      { name: 'Create Admin User', method: 'POST', path: 'api/admin/v1/admin-users', body: { email: 'admin@foldy.co.in', password: '<password>', fullName: 'New Admin', role: 'admin' } },
      { name: 'Get Admin User', method: 'GET', path: 'api/admin/v1/admin-users/:id', pathVars: [{ key: 'id', value: '<adminId>' }] },
      { name: 'Update Admin User', method: 'PATCH', path: 'api/admin/v1/admin-users/:id', pathVars: [{ key: 'id', value: '<adminId>' }], body: { fullName: 'Updated' } },
      { name: 'Set Admin Role', method: 'PATCH', path: 'api/admin/v1/admin-users/:id/role', pathVars: [{ key: 'id', value: '<adminId>' }], body: { role: 'superadmin' } },
      { name: 'Admin Session (me)', method: 'GET', path: 'api/admin/v1/auth/me', description: 'The signed-in admin: identity, role and resolved permissions.' },
      { name: 'Change Password', method: 'POST', path: 'api/admin/v1/auth/change-password', description: 'Signed-in password change — distinct from the OTP forgot-password flow.', body: { currentPassword: '<current>', newPassword: '<new>' } },
      { name: 'List Roles', method: 'GET', path: 'api/admin/v1/roles', description: 'Requires roles.read.' },
      { name: 'Role Options', method: 'GET', path: 'api/admin/v1/roles/options', description: 'Permission + module catalog for the role editor. Auth only — no roles.* permission needed, unlike the rest of this group.' },
      { name: 'Create Role', method: 'POST', path: 'api/admin/v1/roles', description: 'Requires roles.create.', body: { name: 'Support Agent', permissions: ['support.read', 'support.update'] } },
      { name: 'Get Role', method: 'GET', path: 'api/admin/v1/roles/:id', description: 'Requires roles.read.', pathVars: [{ key: 'id', value: '<roleId>' }] },
      { name: 'Update Role', method: 'PATCH', path: 'api/admin/v1/roles/:id', description: 'Requires roles.update.', pathVars: [{ key: 'id', value: '<roleId>' }], body: { name: 'Senior Support Agent' } },
      { name: 'Delete Role', method: 'DELETE', path: 'api/admin/v1/roles/:id', description: 'Requires roles.delete.', pathVars: [{ key: 'id', value: '<roleId>' }] },
      { name: 'Get Role Module Access', method: 'GET', path: 'api/admin/v1/roles/:id/module-access', description: 'Per-module access for the role. Separate sub-resource so it can be edited without rewriting the role.', pathVars: [{ key: 'id', value: '<roleId>' }] },
      { name: 'Update Role Module Access', method: 'PATCH', path: 'api/admin/v1/roles/:id/module-access', description: 'Requires roles.update.', pathVars: [{ key: 'id', value: '<roleId>' }], body: { gst: true, roc: false, tds: true, itr: true } },
      { name: 'Import Calendar Sheet', method: 'POST', path: 'api/admin/v1/calendar/import', description: 'Whole-year event upload (.xlsx/.csv), all-or-nothing validation. multipart field "file"; ?dryRun=true validates without writing.', query: [{ key: 'dryRun', value: 'true' }] },
      { name: 'Calendar Import Template', method: 'GET', path: 'api/admin/v1/calendar/import/template', description: 'Downloads the sample sheet for the importer.' },
      { name: 'Upload Compliance Calendar', method: 'POST', path: 'api/admin/v1/calendar/upload-compliance', description: 'Compliance-specific sheet upload — distinct from Import Calendar Sheet. multipart field "file".' },
      { name: 'Delete Admin User', method: 'DELETE', path: 'api/admin/v1/admin-users/:id', pathVars: [{ key: 'id', value: '<adminId>' }] }
    ]
  },
  chat: {
    key: 'chat',
    name: 'Chat',
    description:
      'Chat session tokens — common to both B2B and B2C (auth only, no segment gate). The privileged CometChat REST key stays server-side; this mints a short-lived token scoped to the logged-in user. The chat uid is taken from the JWT, so there is nothing to pass in the body. Set {{token}} to a user JWT.',
    endpoints: [
      {
        name: 'Create Chat Session',
        method: 'POST',
        path: 'api/v1/chat/session',
        description:
          'Returns { uid, authToken, appId, region }. Creates the remote chat user on first call, so it is safe to call on every login. 503 if chat is not configured on the server.',
        body: {}
      }
    ]
  },

  calendar: {
    key: 'calendar',
    name: 'Calendar',
    description: 'Compliance / events calendar the user reads. Admins curate the entries via the Admin Panel section (calendar CRUD). Set {{token}} to a user JWT.',
    endpoints: [
      { name: 'Get Calendar Events', method: 'GET', path: 'api/v1/calendar', description: 'All events (compliance + general), sorted by date then start time.' }
    ]
  },
  moneyone: {
    key: 'moneyone',
    name: 'Investment (Account Aggregator)',
    description:
      'MoneyOne / OneMoney Account Aggregator — B2C (individual). Flow: create a consent, send the user to webRedirectionUrl to approve at the AA, resolve the consentHandle into a consentId, then fetch data. Replace :template with mf-sip | equity | banking. Set {{token}} to a user JWT.',
    endpoints: [
      {
        name: 'List Product Templates',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/templates',
        description: 'The AA product templates this server exposes.'
      },
      {
        name: 'Create Consent',
        method: 'POST',
        path: 'api/v1/b2c/moneyone/banking/consent',
        description:
          'Returns { webRedirectionUrl, consentHandle, token }. The server persists a PENDING consent and sets the redirect to its own public callback carrying an unguessable token. Send the user to webRedirectionUrl; after they approve/decline, OneMoney redirects to the callback, which verifies the real status and deep-links back into the app. pan / fipID are optional. Swap "banking" for mf-sip or equity.',
        body: {}
      },
      {
        name: 'Consent Status (am I linked?)',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/consent/status',
        description:
          'Latest persisted consent for the logged-in user + template: { linked, status (pending|active|rejected|failed|expired|none), consentId, updatedAt }. Set by the callback after the user returns. This is the app\'s "am I linked?" check.'
      },
      {
        name: 'Revoke Consent',
        method: 'POST',
        path: 'api/v1/b2c/moneyone/banking/consent/revoke',
        description:
          'Withdraws a linked account. Body { consentId? } — optional; the server falls back to the user\'s latest consent for this template. Revokes at OneMoney (/revokeconsent), then marks the local record status=revoked so the app immediately shows "not linked". Returns { consentId, status: "revoked" }.',
        body: { consentId: '' }
      },
      {
        name: 'Accounts List (bank-list screen)',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/accounts',
        description:
          'STORE-AND-SYNC: reads the stored, normalized accounts from our DB (no FinPro call) → { accounts: [{ consentId, linkRefNumber, maskedAccountNumber, bank, holderName, fiType, category, headlineLabel, headlineValue, currency, lastSyncedAt, lastTxnDate, status }] }. holderName is decrypted for the list; the app card shows bank + holderName + masked account + category tag (balance intentionally hidden). Empty until the ingest job has run.'
      },
      {
        name: 'Account Detail (profile + summary)',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/accounts/:linkRef',
        description:
          'Detail header for one account from DB → account fields + { profile (name, maskedPan, email, mobile, address, kyc, nominee, …; decrypted, PAN masked), summaryFields:[{label,value}], holdings:[], dataRangeFrom, dataRangeTo }. Transactions are a separate paged call.'
      },
      {
        name: 'Transactions (paged + filtered)',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/accounts/:linkRef/transactions',
        description:
          'Lazy-loaded transactions from DB, newest first → { items:[…], page, limit, total, hasMore }. Unified bank (credit/debit) + investment (buy/sell) rows. Filters combine with AND.',
        query: [
          { key: 'page', value: '1', description: 'page number (1-based)' },
          { key: 'limit', value: '20', description: 'page size (max 100)' },
          { key: 'from', value: '', description: 'ISO date — start of range' },
          { key: 'to', value: '', description: 'ISO date — end of range' },
          { key: 'direction', value: '', description: 'CSV: credit,debit,buy,sell,installment' },
          { key: 'minAmount', value: '', description: 'min amount' },
          { key: 'maxAmount', value: '', description: 'max amount' },
          { key: 'search', value: '', description: 'text match on description' }
        ]
      },
      {
        name: 'Transactions Export (CSV)',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/accounts/:linkRef/transactions/export',
        description:
          'Streams a CSV download of ALL matching transactions (same filters as the list, no pagination). Content-Disposition: attachment.',
        query: [
          { key: 'from', value: '', description: 'ISO date' },
          { key: 'to', value: '', description: 'ISO date' },
          { key: 'direction', value: '', description: 'CSV of directions' },
          { key: 'search', value: '', description: 'text match' }
        ]
      },
      {
        name: 'Transactions Email',
        method: 'POST',
        path: 'api/v1/b2c/moneyone/banking/accounts/:linkRef/transactions/email',
        description:
          'Emails the filtered CSV statement to the user\'s OWN registered email (never an arbitrary address). Same filter query params as the list. Returns { to, count }.',
        body: {}
      },
      {
        name: 'Manual Sync (refresh now)',
        method: 'POST',
        path: 'api/v1/b2c/moneyone/banking/sync',
        description:
          'Forces a full re-ingest of the latest consent\'s data (getallfidata → normalize → upsert). Body { consentId? } optional. Returns the ingest summary { accounts, transactions, errors }.',
        body: { consentId: '' }
      },
      {
        name: 'Consent Callback (PUBLIC — server-to-server)',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/callback',
        description:
          'PUBLIC — no auth. OneMoney redirects the user\'s browser here with ?token=<random>. The server verifies the real status against OneMoney (never trusts the URL), updates the consent, and 302-redirects to the app deep link (foldy://moneyone/callback?status=…). Not called by clients directly — documented for completeness.',
        query: [{ key: 'token', value: '', description: 'the token from Create Consent' }]
      },
      {
        name: 'Webhook (PROVIDER → server, not /api)',
        method: 'POST',
        path: 'webhook/moneyone',
        description:
          'Provider-called (NOT under /api, NOT auth). OneMoney POSTs consent lifecycle events here — signature-verified via X-Webhook-Signature/X-Webhook-Timestamp against MONEYONE_WEBHOOK_SECRET, idempotent on transaction_id. Events: ANALYTICS_CALLBACK, NUDGES_CALLBACK, CONSENT_REVOKED_CALLBACK. Documented for reference; the console base URL targets /api so it can\'t drive this.',
        body: { event: 'CONSENT_REVOKED_CALLBACK', transaction_id: '<txn>', timestamp: 1719400000, data: { consentId: '<consentId>' } }
      },
      {
        name: 'Resolve Consent',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/consent/resolve',
        description:
          'Exchanges the consentHandle from Create Consent for { consentID, status, accounts }.',
        query: [{ key: 'handle', value: '', description: 'consentHandle from Create Consent' }]
      },
      {
        name: 'Get All Data',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/data/:consentId/all',
        description: 'All financial data available under a granted consent.'
      },
      {
        name: 'Get Account Data',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/data/:consentId/account/:linkRef',
        description: 'One linked account\'s transactions (FinPro /getfidata). Optional ?limit&offset page the transactions so the app pulls a bank\'s data in windows instead of every transaction at once; omit both to fetch all.',
        query: [
          { key: 'limit', value: '', description: 'optional: max transactions per page' },
          { key: 'offset', value: '', description: 'optional: starting point' }
        ]
      },
      {
        name: 'Get Account Balance',
        method: 'GET',
        path: 'api/v1/b2c/moneyone/banking/data/:consentId/account/:linkRef/balance',
        description: 'Balance for a single linked account.'
      }
    ]
  },

  incomeTax: {
    key: 'incomeTax',
    name: 'Income Tax (ITR + 26AS + AIS)',
    description: 'Deepvue-backed e-filing portal: link once (username/password → opaque client id), then pull filed ITRs, Form 26AS and the AIS. Common to B2B + B2C (itr module). Set {{token}}.',
    endpoints: [
      { name: 'Portal Link Status', method: 'GET', path: 'api/v1/income-tax/itr-client/status', description: 'Is the e-filing portal linked, and when data was last pulled.' },
      { name: 'Link Portal Account', method: 'POST', path: 'api/v1/income-tax/itr-client', description: 'Exchange e-filing portal credentials for a client id (once). Password is never stored.', body: { username: 'ABCDE1234F', password: '<portal-password>' } },
      { name: 'Unlink Portal Account', method: 'DELETE', path: 'api/v1/income-tax/itr-client', description: 'Removes the stored client id.' },
      { name: 'Download ITR List', method: 'POST', path: 'api/v1/income-tax/itr/download', description: 'Triggers a fetch; returns { panNo, items[] } of filed ITRs. Charges an ITR download credit.', body: {} },
      { name: 'ITR Details', method: 'GET', path: 'api/v1/income-tax/itr/:itrId', description: 'Curated ITR detail: personal + income + bank accounts (no raw dump).', pathVars: [{ key: 'itrId', value: '<itrId>' }] },
      { name: 'Download 26AS List', method: 'POST', path: 'api/v1/income-tax/26as/download', description: 'Triggers a fetch; returns { panNo, items[] } of 26AS statements. Charges an income-tax (itr) download credit.', body: {} },
      { name: '26AS Details', method: 'GET', path: 'api/v1/income-tax/26as/:tdsId', description: 'Parsed Form 26AS TDS entries + total.', pathVars: [{ key: 'tdsId', value: '<tdsId>' }], query: [{ key: 'financialYear', value: '2024-25' }] },
      { name: 'Download AIS List', method: 'POST', path: 'api/v1/income-tax/ais/download', description: 'Triggers a fetch of the Annual Information Statement; returns { panNo, items[] } of the financial years the portal holds. Charges an income-tax (itr) download credit.', body: {} },
      { name: 'AIS Details', method: 'GET', path: 'api/v1/income-tax/ais/:financialYear', description: 'A single financial year\'s Annual Information Statement. Addressed by FINANCIAL YEAR, not an id (unlike ITR / 26AS). financialYear is required.', pathVars: [{ key: 'financialYear', value: '2024-25' }] },
      { name: 'Render Statement PDF', method: 'POST', path: 'api/v1/income-tax/:itType', description: 'Renders the statement PDF server-side (itType: 26as or itr-x). Charges an income-tax (itr) download credit.', pathVars: [{ key: 'itType', value: '26as' }], body: { downloadLink: '<s3-json-url>', pan: 'ABCDE1234F', financialYear: '2024-25' } }
    ]
  },

  reports: {
    key: 'reports',
    name: 'Reports (B2B)',
    description: 'GST compliance reports & analytics for business users. Set {{token}} (business JWT, gst module).',
    endpoints: [
      { name: 'Late-Fee Exposure', method: 'GET', path: 'api/v1/b2b/reports/late-fee' },
      { name: 'Turnover Bands', method: 'GET', path: 'api/v1/b2b/reports/late-fee/turnover-bands' },
      { name: 'Mark Return Nil', method: 'PATCH', path: 'api/v1/b2b/reports/late-fee/returns/:alertId/nil', pathVars: [{ key: 'alertId', value: '<alertId>' }] },
      { name: 'Multi-GSTIN Grid', method: 'GET', path: 'api/v1/b2b/reports/gstin-grid' },
      { name: 'Sales Trend', method: 'GET', path: 'api/v1/b2b/reports/sales-trend', query: [{ key: 'fy', value: '2024-25' }, { key: 'gstin', value: '' }] },
      { name: 'Compliance Calendar', method: 'GET', path: 'api/v1/b2b/reports/compliance-calendar' },
      { name: 'Snapshot Coverage', method: 'GET', path: 'api/v1/b2b/reports/snapshot-coverage' },
      { name: 'B2B Summary', method: 'GET', path: 'api/v1/b2b/reports/summary', description: 'Cross-module counts (GST + ROC + TDS + ITR) for the B2B home header. Not GST-gated, unlike the other reports here.' }
    ]
  },

  home: {
    key: 'home',
    name: 'Home (B2C)',
    description: 'B2C individual home dashboard: net worth, cash flow, SIP tracker, consent health. Reads stored FiAccount/FiTransaction data only (fast, no provider calls). Set {{token}}.',
    endpoints: [
      { name: 'Home Summary', method: 'GET', path: 'api/v1/b2c/reports' },
      { name: 'SIP Tracker', method: 'GET', path: 'api/v1/b2c/reports/sip' },
      { name: 'Net Worth', method: 'GET', path: 'api/v1/b2c/reports/net-worth' },
      { name: 'Cash Flow', method: 'GET', path: 'api/v1/b2c/reports/cash-flow', query: [{ key: 'months', value: '6' }] },
      { name: 'Consent Health', method: 'GET', path: 'api/v1/b2c/reports/consents' }
    ]
  },

  bank: {
    key: 'bank',
    name: 'Bank Info',
    description: 'IFSC / bank metadata lookup.',
    endpoints: [
      { name: 'Get Bank Info', method: 'GET', path: 'api/v1/bank-info', query: [{ key: 'ifsc', value: 'HDFC0000001' }] }
    ]
  },

  manualUploads: {
    key: 'manualUploads',
    name: 'Manual Uploads',
    description: 'User-uploaded compliance docs (PTAX, trade license, PF/ESI, property papers) by category. Set {{token}}.',
    endpoints: [
      { name: 'Categories', method: 'GET', path: 'api/v1/manual-uploads/categories' },
      { name: 'List Items', method: 'GET', path: 'api/v1/manual-uploads/:category/items', pathVars: [{ key: 'category', value: 'ptax' }] },
      { name: 'Upload Item', method: 'POST', path: 'api/v1/manual-uploads/:category/upload', description: 'multipart, field "file".', pathVars: [{ key: 'category', value: 'ptax' }] },
      { name: 'Download Item', method: 'GET', path: 'api/v1/manual-uploads/items/:id/download', pathVars: [{ key: 'id', value: '<itemId>' }] },
      { name: 'Delete Item', method: 'DELETE', path: 'api/v1/manual-uploads/items/:id', pathVars: [{ key: 'id', value: '<itemId>' }] }
    ]
  },

  notifications: {
    key: 'notifications',
    name: 'Notifications',
    description: 'In-app notification feed for the logged-in user. Set {{token}}.',
    endpoints: [
      { name: 'List', method: 'GET', path: 'api/v1/notifications' },
      { name: 'Unread Count', method: 'GET', path: 'api/v1/notifications/unread-count' },
      { name: 'Mark Read', method: 'POST', path: 'api/v1/notifications/:id/read', pathVars: [{ key: 'id', value: '<notificationId>' }] },
      { name: 'Mark All Read', method: 'POST', path: 'api/v1/notifications/read-all' },
      { name: 'Delete', method: 'DELETE', path: 'api/v1/notifications/:id', pathVars: [{ key: 'id', value: '<notificationId>' }] }
    ]
  }
};

export function getSection(key: string): ApiSection | undefined {
  return API_SECTIONS[key];
}
