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

  // TDS — TRACES jobs
  submitTdsJob:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/submit-job/${certificateType}`, data),

  pollTdsJob:         (certificateType: string, jobId: string, credentials: Record<string, unknown>) =>
    client.post(`/b2b/tds/poll-job/${certificateType}`, { ...credentials, job_id: jobId }),

  fetchTdsJobs:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/fetch-jobs/${certificateType}`, data),

  // Persisted TDS jobs — low-input progress tracking (background-polled server-side).
  listTdsJobs:        (params?: { status?: string; certificate_type?: string }) =>
    client.get('/b2b/tds/jobs', { params }),

  getTdsJob:          (jobId: string) =>
    client.get(`/b2b/tds/jobs/${jobId}`),
};
