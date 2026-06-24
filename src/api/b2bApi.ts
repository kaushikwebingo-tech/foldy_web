import { client } from './client';

// All B2B GST endpoints are mounted flat under /b2b/gst ; TDS under /b2b/tds
export const b2bApi = {
  // GST profiles (a Business can save multiple GSTINs; verified via WhiteBooks on create)
  createGstProfile:   (gstin: string, title: string, gstUsername: string) =>
    client.post('/b2b/gst/profiles', { gstin, title, gstUsername }),

  listGstProfiles:    () =>
    client.get('/b2b/gst/profiles'),

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

  getGstProfileSummary: (id: string, type: string, ret_period: string) =>
    client.post(`/b2b/gst/profiles/${id}/summary/${type}`, { ret_period }),

  // GST — business info
  getBusinessInfo:    (gstin: string) =>
    client.post('/b2b/gst/get-business-info', { gstin }),

  // GST — returns / finance status
  trackGstReturns:    (gstin: string, financial_year: string, gstr?: string) =>
    client.post('/b2b/gst/get-finance-status', { gstin, financial_year, gstr }),

  // GST — taxpayer session (type is required by the server: GSTR1|GSTR3B|GSTR9|GSTR9C|GSTR1A)
  generateGstOtp:     (username: string, gstin: string, type: string, title?: string) =>
    client.post('/b2b/gst/otp', { username, gstin, type, ...(title ? { title } : {}) }),

  verifyGstOtp:       (username: string, gstin: string, otp: string) =>
    client.post('/b2b/gst/otp/verify', { username, gstin, otp }),

  refreshGstSession:  (taxpayer_token: string) =>
    client.post('/b2b/gst/session/refresh', { taxpayer_token }),

  getGstr1Summary:    (taxpayer_token: string, gstin: string, year: string, month: string, summary_type?: string) =>
    client.post('/b2b/gst/gstr1/summary', { taxpayer_token, gstin, year, month, summary_type }),

  getGstr1B2b:        (taxpayer_token: string, gstin: string, year: string, month: string) =>
    client.post('/b2b/gst/gstr1/b2b', { taxpayer_token, gstin, year, month }),

  // Comprehensive summary for one return type (gstr1|gstr1a|gstr3b|gstr9|gstr9c).
  // ret_period is MMYYYY (e.g. 042026); year/month optional alternatives.
  getGstSummary:      (type: string, data: { taxpayer_token: string; gstin: string; ret_period: string; [k: string]: unknown }) =>
    client.post(`/b2b/gst/summary/${type}`, data),

  getSalesSummary:    (gstin: string, fy: string, taxpayer_token: string) =>
    client.get('/b2b/gst/sales-summary', { params: { gstin, fy, taxpayer_token } }),

  markAsFiled:        (gstin: string, formType: string, period: string) =>
    client.post('/b2b/gst/mark-as-filed', { gstin, formType, period }),

  // TDS — TRACES jobs
  submitTdsJob:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/submit-job/${certificateType}`, data),

  pollTdsJob:         (certificateType: string, jobId: string, credentials: Record<string, unknown>) =>
    client.post(`/b2b/tds/poll-job/${certificateType}`, { ...credentials, job_id: jobId }),

  fetchTdsJobs:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/fetch-jobs/${certificateType}`, data),
};
