import { client } from './client';

// All B2B GST endpoints are mounted flat under /b2b/gst ; TDS under /b2b/tds
export const b2bApi = {
  // GST profiles (a Business can save multiple GSTINs; verified via WhiteBooks on create).
  // No title — the server derives it from the GSTIN's business name + HQ/BR tag
  // (first GSTIN = HQ, the rest = branches).
  createGstProfile:   (gstin: string, gstUsername: string) =>
    client.post('/b2b/gst/profiles', { gstin, gstUsername }),

  listGstProfiles:    () =>
    client.get('/b2b/gst/profiles'),

  // Filing alerts — returns due today or overdue and still unfiled. Written
  // nightly by gstNotificationCron; the app shows these once a day on login.
  listFilingAlerts:   () =>
    client.get('/b2b/gst/filing-alerts'),

  // "Already filed" — our filing status can lag the GST portal, so the user
  // needs a way to clear a warning we can't yet verify.
  dismissFilingAlert: (id: string) =>
    client.patch(`/b2b/gst/filing-alerts/${id}/dismiss`, {}),

  getGstProfile:      (id: string) =>
    client.get(`/b2b/gst/profiles/${id}`),

  deleteGstProfile:   (id: string) =>
    client.delete(`/b2b/gst/profiles/${id}`),

  // GST profile session (authorise → persisted 6h token → data calls)
  requestGstSessionOtp: (id: string) =>
    client.post(`/b2b/gst/profiles/${id}/authorize/otp`),

  verifyGstSessionOtp:  (id: string, otp: string) =>
    client.post(`/b2b/gst/profiles/${id}/authorize/verify`, { otp }),

  getGstSessionStatus:  (id: string) =>
    client.get(`/b2b/gst/profiles/${id}/session`),

  // Make one saved GSTIN the primary/default profile for the business.
  setPrimaryGstProfile: (id: string) =>
    client.patch(`/b2b/gst/profiles/${id}/primary`),

  // Set the profile's turnover band (drives late-fee computation).
  setGstTurnoverBand: (id: string, band: string) =>
    client.patch(`/b2b/gst/profiles/${id}/turnover-band`, { band }),

  getGstProfileSummary: (id: string, type: string, ret_period: string) =>
    client.post(`/b2b/gst/profiles/${id}/summary/${type}`, { ret_period }),

  // Same summary rendered as a downloadable PDF (streamed bytes, nothing stored).
  getGstProfileSummaryPdf: (id: string, type: string, ret_period: string) =>
    client.post(`/b2b/gst/profiles/${id}/summary/${type}/pdf`, { ret_period },
      { responseType: 'blob' }),

  // GSTR-2A — inward supplies / auto-drafted statement, by section (default b2b).
  // Body: { ret_period: MMYYYY, section?, ctin?, fromtime?, portcode?, benumber?, bedate? }.
  getGstProfileGstr2a: (id: string, data: { ret_period: string; section?: string; [k: string]: unknown }) =>
    client.post(`/b2b/gst/profiles/${id}/gstr2a`, data),

  // GSTR-2B — auto-drafted ITC statement. Body: { ret_period: MMYYYY, filenum? }.
  getGstProfileGstr2b: (id: string, data: { ret_period: string; filenum?: string }) =>
    client.post(`/b2b/gst/profiles/${id}/gstr2b`, data),

  // On-demand 2B generation → returns an internal transaction id; poll status by it.
  generateGstProfileGstr2b: (id: string, ret_period: string) =>
    client.post(`/b2b/gst/profiles/${id}/gstr2b/generate`, { ret_period }),

  getGstProfileGstr2bStatus: (id: string, intTranId: string) =>
    client.get(`/b2b/gst/profiles/${id}/gstr2b/status/${intTranId}`),

  // GSTR-1 sales summary for a profile, by financial year (e.g. "2025-26").
  getGstProfileSalesSummary: (id: string, fy: string) =>
    client.get(`/b2b/gst/profiles/${id}/sales-summary`, { params: { fy } }),

  // Mark a return filed so the reminder cron stops nudging. period = MMYYYY.
  markGstReturnFiled: (gstin: string, formType: string, period: string) =>
    client.post('/b2b/gst/mark-as-filed', { gstin, formType, period }),

  // GST notices for a profile (server-held token; date defaults to today, ~last 60 days).
  getGstProfileNotices: (id: string, date?: string) =>
    client.get(`/b2b/gst/profiles/${id}/notices`, { params: date ? { date } : undefined }),

  getGstProfileNoticeDetails: (id: string, refid: string) =>
    client.get(`/b2b/gst/profiles/${id}/notices/${refid}`),

  // GST — business info
  getBusinessInfo:    (gstin: string) =>
    client.post('/b2b/gst/get-business-info', { gstin }),

  // GST — returns / finance status
  trackGstReturns:    (gstin: string, financial_year: string, gstr?: string) =>
    client.post('/b2b/gst/get-finance-status', { gstin, financial_year, gstr }),

  // TDS — TRACES jobs.
  // username/password/tan are OPTIONAL now: with a saved profile send only the
  // challan block (plus an optional profileId) and the server supplies the
  // login. Inline credentials still win when present.
  submitTdsJob:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/submit-job/${certificateType}`, data),

  pollTdsJob:         (certificateType: string, jobId: string, credentials: Record<string, unknown>) =>
    client.post(`/b2b/tds/poll-job/${certificateType}`, { ...credentials, job_id: jobId }),

  fetchTdsJobs:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/fetch-jobs/${certificateType}`, data),

  // Persisted TDS jobs — low-input progress tracking (background-polled server-side).
  // `kind` separates certificate history from notice analyses, which share this
  // collection; 'certificate' also matches legacy rows saved before the field.
  listTdsJobs:        (params?: { status?: string; certificate_type?: string; kind?: 'certificate' | 'potential_notice' }) =>
    client.get('/b2b/tds/jobs', { params }),

  getTdsJob:          (jobId: string) =>
    client.get(`/b2b/tds/jobs/${jobId}`),

  // Streams the completed certificate. The server proxies the provider's
  // short-lived URL, so the caller never sees it; 404 while TRACES is still
  // preparing the file.
  downloadTdsCertificate: (jobId: string) =>
    client.get(`/b2b/tds/jobs/${jobId}/certificate`, { responseType: 'blob' }),

  // TDS "Potential Notices" — async analytics, no TRACES credentials. Submit
  // returns a job id; the cron polls Sandbox; GET returns the parsed notices.
  submitTdsPotentialNotice:    (data: Record<string, unknown>) =>
    client.post('/b2b/tds/potential-notices', data),

  getTdsPotentialNoticeStatus: (jobId: string) =>
    client.get('/b2b/tds/potential-notices', { params: { job_id: jobId } }),

  searchTdsPotentialNotices:   (data: Record<string, unknown>) =>
    client.post('/b2b/tds/potential-notices/search', data),

  // TDS credential profiles — "connect my company once".
  // A profile holds the deductor TAN plus an ENCRYPTED TRACES username/password.
  // The credentials never come back in any response: each profile reports only
  // `hasCredentials: boolean`. Once one exists, submit / poll / potential-notice
  // can omit username+password entirely and the server resolves them.
  listTdsProfiles:    () =>
    client.get('/b2b/tds/profiles'),

  // Body: { tan, tracesUsername, tracesPassword, label? }
  createTdsProfile:   (data: Record<string, unknown>) =>
    client.post('/b2b/tds/profiles', data),

  getTdsProfile:      (id: string) =>
    client.get(`/b2b/tds/profiles/${id}`),

  // Partial: send only what changes. Omitting tracesPassword keeps the stored one.
  updateTdsProfile:   (id: string, data: Record<string, unknown>) =>
    client.patch(`/b2b/tds/profiles/${id}`, data),

  deleteTdsProfile:   (id: string) =>
    client.delete(`/b2b/tds/profiles/${id}`),

  // Disconnect AND erase: unlike deleteTdsProfile (which only forgets the
  // login), this also deletes every certificate and notice analysis fetched
  // with it. Irreversible.
  revokeTdsProfile:   (id: string) =>
    client.post(`/b2b/tds/profiles/${id}/revoke`),

  // Exactly one profile per user is the default; it is what an omitted
  // profileId resolves to.
  setDefaultTdsProfile: (id: string) =>
    client.post(`/b2b/tds/profiles/${id}/default`),

  // "Connect TDS account" — link / read the deductor TAN. Now backed by the
  // same profile store, so a TAN-only link and a full login are one record.
  linkTdsTan:         (tan: string) =>
    client.post('/b2b/tds/link-tan', { tan }),

  getTdsTan:          () =>
    client.get('/b2b/tds/tan'),

  // TDS Calculator — compute TDS on a payment (no TRACES creds). Non-salary +
  // salary/sync answer synchronously; the bulk salary flow submits a job then
  // polls by id. Each provider-hitting call costs 1 TDS credit (refunded on failure).
  calcTdsNonSalary:       (data: Record<string, unknown>) =>
    client.post('/b2b/tds/calculator/non-salary', data),

  calcTdsSalarySync:      (data: Record<string, unknown>) =>
    client.post('/b2b/tds/calculator/salary/sync', data),

  submitTdsSalaryBulk:    (data: Record<string, unknown>) =>
    client.post('/b2b/tds/calculator/salary', data),

  getTdsSalaryBulkStatus: (jobId: string) =>
    client.get('/b2b/tds/calculator/salary', { params: { job_id: jobId } }),

  // --- GST notices via the TAXPAYER session (POST) ---
  // Distinct from getProfileNotices above: those read a saved profile by id,
  // these use the active taxpayer token and take the GSTIN in the body.
  getNoticeList:    (data: Record<string, unknown>) =>
    client.post('/b2b/gst/notices/list', data),

  getNoticeDetails: (data: Record<string, unknown>) =>
    client.post('/b2b/gst/notices/details', data),

  // Look a taxpayer up by GSTIN and persist it as a profile in one call.
  searchAndSaveTaxpayer: (data: Record<string, unknown>) =>
    client.post('/b2b/gst/profile', data),
};
