import { adminClient } from './client';

/* Broadcast audience targeting. All fields optional; ANDed together. */
export interface AudienceFilters {
  planTypes?: Array<'trial' | 'business' | 'individual' | 'enterprise'>;
  joinedDaysAgo?: number;   // signed up EXACTLY this many days ago (0 = today)
  expiredOnly?: boolean;
  workspace?: 'business' | 'individual';
}

export type PlanPayload = {
  planType: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  interval: string;
  storageLimit: number; // bytes
  maxFolders: number;
  maxFilesPerFolder: number;
  isActive?: boolean;
};

export const adminApi = {
  login:          (email: string, password: string) =>
    adminClient.post('/auth/login', { email, password }),

  register:       (email: string, password: string, fullName: string) =>
    adminClient.post('/auth/register', { email, password, fullName }),

  // --- Password recovery (OTP-based) ---
  forgotPassword: (email: string) =>
    adminClient.post('/auth/forgot-password', { email }),

  verifyEmailOtp: (email: string, otp: string) =>
    adminClient.post('/auth/verify-email-otp', { email, otp }),

  updatePassword: (email: string, otp: string, newPassword: string) =>
    adminClient.post('/auth/update-password', { email, otp, newPassword }),

  logout:         () =>
    adminClient.post('/auth/logout'),

  listAdmins:     (page = 1, limit = 10, search?: string) =>
    adminClient.get('/admin-users', { params: { page, limit, search } }),

  // --- Subscription plan catalog (Super Admin) ---
  listPlans:      () =>
    adminClient.get('/plans'),

  createPlan:     (payload: PlanPayload) =>
    adminClient.post('/plans', payload),

  updatePlan:     (id: string, payload: Partial<PlanPayload>) =>
    adminClient.put(`/plans/${id}`, payload),

  setPlanStatus:  (id: string, isActive: boolean) =>
    adminClient.patch(`/plans/${id}/status`, { isActive }),

  // --- Statistics (Super Admin) ---
  getStats:       (activeDays = 30, trendMonths = 6) =>
    adminClient.get('/stats/overview', { params: { activeDays, trendMonths } }),

  getRevenueStats: (trendMonths = 6) =>
    adminClient.get('/stats/revenue', { params: { trendMonths } }),

  // --- Management actions (Super Admin) ---
  listAppUsers:   (page = 1, limit = 10, search?: string) =>
    adminClient.get('/users', { params: { page, limit, search } }),

  getUserDetails: (userId: string) =>
    adminClient.get(`/users/${userId}`),

  blockUser:      (userId: string, reason: string) =>
    adminClient.patch(`/users/${userId}/block`, { reason }),

  unblockUser:    (userId: string, reason?: string) =>
    adminClient.patch(`/users/${userId}/unblock`, { reason }),

  // Per-user module access — any subset; omitted flags are left unchanged.
  updateUserModules: (
    userId: string,
    modules: Partial<{ gst: boolean; roc: boolean; tds: boolean; itr: boolean; investment: boolean }>,
  ) => adminClient.patch(`/users/${userId}/modules`, modules),

  cancelSubscription: (userId: string, reason: string) =>
    adminClient.post(`/users/${userId}/cancel-subscription`, { reason }),

  refundPayment:  (paymentId: string, amount?: number, reason?: string) =>
    adminClient.post(`/payments/${paymentId}/refund`, { amount, reason }),

  listAuditLogs:  (page = 1, limit = 20, action?: string) =>
    adminClient.get('/audit-logs', { params: { page, limit, action } }),

  // --- Push notifications (Super Admin) ---
  // Audience filters combine with AND; omit to reach every subscribed device.
  broadcastNotification: (title: string, message: string, filters?: AudienceFilters) =>
    adminClient.post('/notifications/broadcast', { title, message, ...(filters ? { filters } : {}) }),

  // Recipient count for the filters, without sending. A broadcast can't be
  // recalled, so check this first.
  previewBroadcastAudience: (filters: AudienceFilters = {}) =>
    adminClient.post('/notifications/broadcast/preview', { filters }),

  sendUserNotification: (userId: string, title: string, message: string) =>
    adminClient.post(`/notifications/users/${userId}`, { title, message }),

  listNotifications: (page = 1, limit = 20, audience?: 'broadcast' | 'user') =>
    adminClient.get('/notifications', { params: { page, limit, audience } }),

  // --- Contact Support triage (admin) ---
  listSupportQueries: (page = 1, limit = 20, status?: string, search?: string) =>
    adminClient.get('/support/queries', { params: { page, limit, status, search } }),

  updateSupportQueryStatus: (id: string, status: string, response?: string) =>
    adminClient.patch(`/support/queries/${id}/status`, { status, ...(response ? { response } : {}) }),

  // --- Feature flags / kill-switches (admin) --- server: /admin/v1/features
  // A feature can be operational, disabled-manual, or api-error-auto (auto-off
  // when its provider errors). killSwitch is the on/off the error-provider reads.
  listFeatures: () =>
    adminClient.get('/features'),

  // Body: { title, apiProvider, redisKey?, status?, killSwitch?, description?, targetPlanId? }
  createFeature: (payload: Record<string, unknown>) =>
    adminClient.post('/features', payload),

  updateFeature: (id: string, payload: Record<string, unknown>) =>
    adminClient.put(`/features/${id}`, payload),

  // Toggle REQUIRES a killSwitch body (and optionally a status). This was
  // out of sync — the server rejects a bodyless toggle.
  toggleFeature: (id: string, killSwitch: boolean, status?: string) =>
    adminClient.patch(`/features/${id}/toggle`, { killSwitch, ...(status ? { status } : {}) }),

  deleteFeature: (id: string) =>
    adminClient.delete(`/features/${id}`),

  // --- Compliance / events calendar (admin CRUD) --- server: /admin/v1/calendar
  // Body: { title, description?, date (YYYY-MM-DD), timeStart (HH:mm), timeEnd (HH:mm),
  //         status? (pending|approval|reschedule|cancel),
  //         eventType? (event|compliance|holiday),
  //         module? (GST|TDS|ROC|ITR — omit/'' for holidays) }
  listCalendarEvents: (month?: string) =>
    adminClient.get('/calendar', { params: month ? { month } : undefined }),

  createCalendarEvent: (payload: Record<string, unknown>) =>
    adminClient.post('/calendar', payload),

  updateCalendarEvent: (id: string, payload: Record<string, unknown>) =>
    adminClient.put(`/calendar/${id}`, payload),

  deleteCalendarEvent: (id: string) =>
    adminClient.delete(`/calendar/${id}`),

  // events: [{ title, date, timeStart?, timeEnd?, status?, eventType? }]
  bulkCreateCalendarEvents: (events: Record<string, unknown>[]) =>
    adminClient.post('/calendar/bulk', { events }),

  // Clone a whole month's compliance events from the previous year.
  importCalendarFromPreviousYear: (targetMonth: string) =>
    adminClient.post('/calendar/import-previous-year', { targetMonth }),

  // Sample .xlsx an admin fills in for the spreadsheet import. Generated from
  // the same column spec the importer validates against, so it cannot drift.
  downloadCalendarImportTemplate: () =>
    adminClient.get('/calendar/import/template', { responseType: 'blob' }),

  /*
   * Import a whole spreadsheet of events (multipart, field name "file";
   * .xlsx/.xls/.csv, max 5MB). Required columns: Title, Date, Module.
   *
   * All-or-nothing: any invalid row, any duplicate inside the file, or any
   * event that already exists (same title + date) rejects the entire upload
   * with 400 and { reason, errors: [{ row, column, message }] } — nothing is
   * written. Pass dryRun to validate and preview without importing.
   */
  importCalendarSheet: (file: File, dryRun = false) => {
    const form = new FormData();
    form.append('file', file);
    return adminClient.post('/calendar/import', form, { params: { dryRun } });
  },

  // --- Credits: per-module costs + buyable packs (Super Admin) --- /credits
  getCreditCosts: () =>
    adminClient.get('/credits/costs'),
  updateCreditCosts: (payload: Record<string, unknown>) =>
    adminClient.put('/credits/costs', payload),
  listAdminCreditPacks: () =>
    adminClient.get('/credits/packs'),
  createCreditPack: (payload: Record<string, unknown>) =>
    adminClient.post('/credits/packs', payload),
  updateCreditPack: (id: string, payload: Record<string, unknown>) =>
    adminClient.put(`/credits/packs/${id}`, payload),
  // One user's two-bucket wallet: plan allowance (resets each cycle) + purchased
  // top-up (never expires). PATCH sets absolute values or nudges one bucket.
  getUserCredits: (userId: string) =>
    adminClient.get(`/credits/users/${userId}`),
  getUserCreditLedger: (userId: string, module?: string) =>
    adminClient.get(`/credits/users/${userId}/ledger`, { params: module ? { module } : undefined }),
  adjustUserCredits: (userId: string, payload: Record<string, unknown>) =>
    adminClient.patch(`/credits/users/${userId}`, payload),

  // --- Report engine (Super Admin) --- server: /admin/v1/reports
  // A report is a saved DEFINITION run by the safe, registry-whitelisted engine
  // (legacy module/reportView reports still supported).
  // Catalog of reportable data sources + fields (drives the builder + whitelist).
  listReportDataSources: () =>
    adminClient.get('/reports/data-sources'),
  // Live preview. Body: { definition, page?, userScopeId?, noCache? }
  previewReport: (payload: Record<string, unknown>) =>
    adminClient.post('/reports/preview', payload),
  // Stream matching rows as CSV. Body: { definition, userScopeId? }
  exportReportCsv: (payload: Record<string, unknown>) =>
    adminClient.post('/reports/export', payload, { responseType: 'blob' }),
  // Engine: { reportName, definition, published?, userScoped? }; legacy: { reportName, module, reportView }
  createReport: (payload: Record<string, unknown>) =>
    adminClient.post('/reports', payload),
  // Optional filters: { module?, reportView?, search?, page?, limit? }
  listReports: (params?: Record<string, unknown>) =>
    adminClient.get('/reports', { params }),
  getReportsDashboard: () =>
    adminClient.get('/reports/dashboard'),
  // Published reports + their cached data — the dashboard feed.
  listPublishedReports: () =>
    adminClient.get('/reports/published'),
  // One report + its definition (no run) — powers builder edit mode.
  getReport: (reportId: string) =>
    adminClient.get(`/reports/${reportId}`),
  // Run a saved report. params: { userScopeId?, page?, noCache? }
  getReportData: (reportId: string, params?: Record<string, unknown>) =>
    adminClient.get(`/reports/${reportId}/data`, { params }),
  // Partial update: { reportName?, description?, definition?, published?, userScoped? }
  updateReport: (reportId: string, payload: Record<string, unknown>) =>
    adminClient.patch(`/reports/${reportId}`, payload),
  deleteReport: (reportId: string) =>
    adminClient.delete(`/reports/${reportId}`),

  // --- Saved searches (Super Admin) --- /saved-searches
  createSavedSearch: (payload: Record<string, unknown>) =>
    adminClient.post('/saved-searches', payload),
  listSavedSearches: () =>
    adminClient.get('/saved-searches'),
  getSavedSearch: (id: string) =>
    adminClient.get(`/saved-searches/${id}`),
  updateSavedSearch: (id: string, payload: Record<string, unknown>) =>
    adminClient.patch(`/saved-searches/${id}`, payload),
  deleteSavedSearch: (id: string) =>
    adminClient.delete(`/saved-searches/${id}`),
  executeSavedSearch: (id: string) =>
    adminClient.post(`/saved-searches/${id}/execute`),

  // --- Cron jobs: status, run history, manual trigger (Super Admin) --- /crons
  listCronStatus: () =>
    adminClient.get('/crons/status'),
  listCronRuns: () =>
    adminClient.get('/crons/runs'),
  getCronRun: (id: string) =>
    adminClient.get(`/crons/runs/${id}`),
  runCron: (name: string) =>
    adminClient.post(`/crons/${name}/run`),

  // --- Advanced user search (Super Admin) --- POST /users/search
  searchUsers: (payload: Record<string, unknown>) =>
    adminClient.post('/users/search', payload),

  // --- Sub-admin (admin user) management (Super Admin) --- /admin-users
  createAdminUser: (payload: Record<string, unknown>) =>
    adminClient.post('/admin-users', payload),
  getAdminUser: (id: string) =>
    adminClient.get(`/admin-users/${id}`),
  updateAdminUser: (id: string, payload: Record<string, unknown>) =>
    adminClient.patch(`/admin-users/${id}`, payload),
  setAdminUserRole: (id: string, role: string) =>
    adminClient.patch(`/admin-users/${id}/role`, { role }),
  deleteAdminUser: (id: string) =>
    adminClient.delete(`/admin-users/${id}`),
};
