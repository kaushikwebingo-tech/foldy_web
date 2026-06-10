import { client } from './client';

// All B2B GST endpoints are mounted flat under /b2b/gst ; TDS under /b2b/tds
export const b2bApi = {
  // GST — business info
  getBusinessInfo:    (gstin: string) =>
    client.post('/b2b/gst/get-business-info', { gstin }),

  // GST — returns / finance status
  trackGstReturns:    (gstin: string, financial_year: string, gstr?: string) =>
    client.post('/b2b/gst/get-finance-status', { gstin, financial_year, gstr }),

  // GST — taxpayer session
  generateGstOtp:     (username: string, gstin: string) =>
    client.post('/b2b/gst/otp', { username, gstin }),

  verifyGstOtp:       (username: string, gstin: string, otp: string) =>
    client.post('/b2b/gst/otp/verify', { username, gstin, otp }),

  refreshGstSession:  (taxpayer_token: string) =>
    client.post('/b2b/gst/session/refresh', { taxpayer_token }),

  getGstr1Summary:    (taxpayer_token: string, gstin: string, year: string, month: string, summary_type?: string) =>
    client.post('/b2b/gst/gstr1/summary', { taxpayer_token, gstin, year, month, summary_type }),

  getGstr1B2b:        (taxpayer_token: string, gstin: string, year: string, month: string) =>
    client.post('/b2b/gst/gstr1/b2b', { taxpayer_token, gstin, year, month }),

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
