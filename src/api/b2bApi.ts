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

  // TDS — TRACES jobs
  submitTdsJob:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/submit-job/${certificateType}`, data),

  pollTdsJob:         (certificateType: string, jobId: string, credentials: Record<string, unknown>) =>
    client.post(`/b2b/tds/poll-job/${certificateType}`, { ...credentials, job_id: jobId }),

  fetchTdsJobs:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/fetch-jobs/${certificateType}`, data),
};
