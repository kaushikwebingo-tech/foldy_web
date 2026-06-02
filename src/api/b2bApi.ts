import { client } from './client';

export const b2bApi = {
  // GST Profile
  getBusinessInfo:    (gstin: string) =>
    client.post('/b2b/gst-profile/business-info', { gstin }),

  // Finance Status
  trackGstReturns:    (gstin: string, financial_year: string, gstr?: string) =>
    client.post('/b2b/finance-status/track', { gstin, financial_year, gstr }),

  // GST Taxpayer
  generateGstOtp:     (username: string, gstin: string) =>
    client.post('/b2b/gst-taxpayer/generate-otp', { username, gstin }),

  verifyGstOtp:       (username: string, gstin: string, otp: string) =>
    client.post('/b2b/gst-taxpayer/verify-otp', { username, gstin, otp }),

  refreshGstSession:  (taxpayer_token: string) =>
    client.post('/b2b/gst-taxpayer/refresh-session', { taxpayer_token }),

  getGstr1Summary:    (taxpayer_token: string, gstin: string, year: string, month: string, summary_type?: string) =>
    client.post('/b2b/gst-taxpayer/gstr1/summary', { taxpayer_token, gstin, year, month, summary_type }),

  getGstr1B2b:        (taxpayer_token: string, gstin: string, year: string, month: string) =>
    client.post('/b2b/gst-taxpayer/gstr1/b2b', { taxpayer_token, gstin, year, month }),

  getSalesSummary:    (gstin: string, fy: string, taxpayer_token: string) =>
    client.get('/b2b/gst-taxpayer/sales-summary', { params: { gstin, fy, taxpayer_token } }),

  markAsFiled:        (gstin: string, formType: string, period: string) =>
    client.post('/b2b/gst-taxpayer/mark-filed', { gstin, formType, period }),

  // TDS
  submitTdsJob:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/${certificateType}/submit`, data),

  pollTdsJob:         (certificateType: string, jobId: string, credentials: Record<string, unknown>) =>
    client.post(`/b2b/tds/${certificateType}/poll`, { ...credentials, job_id: jobId }),

  fetchTdsJobs:       (certificateType: string, data: Record<string, unknown>) =>
    client.post(`/b2b/tds/${certificateType}/search`, data),
};
