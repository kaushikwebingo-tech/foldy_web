import type { PmEndpoint, PmField } from './postmanCore';

type AdminEndpoint = PmEndpoint & {
  auth?: 'none' | 'admin';
  capture?: Record<string, string>;
  statuses?: number[];
};
const prefix = 'api/admin/v1/';
const page: PmField[] = [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }];
const search: PmField[] = [...page, { key: 'search', value: '', description: 'Optional text search.' }];
const planBody = {
  planType: 'business', workspace: 'business', name: 'API Test Plan {{$timestamp}}',
  description: 'Synthetic plan for API testing.', price: 499, currency: 'INR', interval: 'monthly',
  storageLimit: 21474836480, memberLimit: 5, allowedCredits: { pool: 200 }, isActive: true,
};
const filters = { query: '', deviceTypes: [], workspaces: [], subscriptionStates: [], accountStatuses: [] };
const reportDefinition = { dataSource: 'users', visualization: 'table', columns: ['fullName', 'email', 'createdAt'] };
function variableFor(path: string, key: string): string {
  if (key !== 'id') return ({ name: 'cronName', identifier: 'identifier', ticketId: 'queryId', templateId: 'supportTemplateId', attachmentId: 'supportAttachmentId' } as Record<string, string>)[key] ?? key;
  if (path.startsWith('admin-users/')) return 'adminUserId';
  if (path.startsWith('roles/')) return 'adminRoleId';
  if (path.startsWith('plans/')) return 'planId';
  if (path.startsWith('storage-addons/')) return 'storageAddonId';
  if (path.startsWith('credits/packs/')) return 'packId';
  if (path.startsWith('features/')) return 'featureId';
  if (path.startsWith('calendar/')) return 'eventId';
  if (path.startsWith('crons/')) return 'runId';
  if (path.startsWith('support/queries/')) return 'queryId';
  return key;
}
function endpoint(name: string, method: PmEndpoint['method'], path: string, extra: Partial<AdminEndpoint> = {}): AdminEndpoint {
  const keys = [...path.matchAll(/:([A-Za-z]\w*)/g)].map(match => match[1]!);
  return { name, method, path: prefix + path, auth: 'admin',
    ...(keys.length ? { pathVars: keys.map(key => ({ key, value: `{{${variableFor(path, key)}}}` })) } : {}),
    ...extra,
  };
}

/** Curated examples checked against current admin validators and controllers.
 * Catalog-only compatibility routes remain documented with their real refusal.
 */
const definitions: AdminEndpoint[] = [
  endpoint('Admin Login', 'POST', 'auth/login', { auth: 'none', body: { email: '{{adminEmail}}', password: '{{adminPassword}}' }, capture: { adminToken: 'data.token' } }),
  endpoint('Bootstrap First Admin (non-production only)', 'POST', 'auth/register', { auth: 'none', body: { email: '{{adminEmail}}', password: '{{adminPassword}}', fullName: 'API Test Administrator' }, description: 'Only an empty administrator database outside production may bootstrap here. Existing installations return 403; use admin-users to add employees.', statuses: [201, 403] }),
  endpoint('Admin Session', 'GET', 'auth/me'),
  endpoint('Admin Forgot Password', 'POST', 'auth/forgot-password', { auth: 'none', body: { email: '{{adminEmail}}' } }),
  endpoint('Admin Verify Reset OTP', 'POST', 'auth/verify-email-otp', { auth: 'none', body: { email: '{{adminEmail}}', otp: '{{otp}}' } }),
  endpoint('Admin Reset Password', 'POST', 'auth/update-password', { auth: 'none', body: { email: '{{adminEmail}}', otp: '{{otp}}', newPassword: '{{adminNewPassword}}' } }),
  endpoint('Admin Change Password', 'POST', 'auth/change-password', { body: { currentPassword: '{{adminPassword}}', newPassword: '{{adminNewPassword}}' }, description: 'New password must differ from current and contain 8–128 characters. Ends the current session; log in again using the new password.' }),
  endpoint('Admin Logout', 'POST', 'auth/logout', { description: 'Revokes the current {{adminToken}}. App {{token}} is a separate session.' }),

  endpoint('List Admin Employees', 'GET', 'admin-users'),
  endpoint('Search Admin Employees', 'GET', 'admin-users/list', { query: search }),
  endpoint('Create Admin Employee', 'POST', 'admin-users', { body: { fullName: 'API Test Employee', email: '{{adminEmployeeEmail}}', phone: '{{adminEmployeePhone}}', password: '{{adminEmployeePassword}}', roleId: '{{adminRoleId}}' }, capture: { adminUserId: 'data._id' }, statuses: [201] }),
  endpoint('Get Admin Employee', 'GET', 'admin-users/:id'),
  endpoint('Update Admin Employee', 'PATCH', 'admin-users/:id', { body: { fullName: 'Updated API Test Employee' } }),
  endpoint('Change Admin Employee Role', 'PATCH', 'admin-users/:id/role', { body: { roleId: '{{adminRoleId}}' } }),
  endpoint('Deactivate Admin Employee', 'DELETE', 'admin-users/:id'),

  endpoint('List Admin Roles', 'GET', 'roles'),
  endpoint('Admin Permission Options', 'GET', 'roles/options'),
  endpoint('Create Admin Role', 'POST', 'roles', { body: { name: 'API Test Role {{$timestamp}}', permissions: ['support.read', 'support.update'], moduleAccess: { gst: true, roc: false, tds: false, itr: false } }, capture: { adminRoleId: 'data._id' }, statuses: [201] }),
  endpoint('Get Admin Role', 'GET', 'roles/:id'),
  endpoint('Update Admin Role', 'PATCH', 'roles/:id', { body: { description: 'Updated by the API test collection.' } }),
  endpoint('Delete Admin Role', 'DELETE', 'roles/:id', { description: 'Cannot delete system Administrator or a role assigned to any admin employee.' }),
  endpoint('Get Admin Role Module Access', 'GET', 'roles/:id/module-access'),
  endpoint('Update Admin Role Module Access', 'PATCH', 'roles/:id/module-access', { body: { gst: true, roc: false, tds: false, itr: true }, description: 'Direct moduleAccess map; supported module names come from GET roles/options.' }),

  endpoint('List Subscription Plans', 'GET', 'plans'),
  endpoint('Get Subscription Plan', 'GET', 'plans/:id'),
  endpoint('Create Subscription Plan', 'POST', 'plans', { body: planBody, capture: { planId: 'data._id' }, statuses: [201] }),
  endpoint('Update Subscription Plan', 'PUT', 'plans/:id', { body: { name: 'Updated API Test Plan', price: 499, memberLimit: 5 } }),
  endpoint('Activate / Deactivate Subscription Plan', 'PATCH', 'plans/:id/status', { body: { isActive: false } }),
  endpoint('List Storage Add-ons', 'GET', 'storage-addons'),
  endpoint('Get Storage Add-on', 'GET', 'storage-addons/:id'),
  endpoint('Create Storage Add-on', 'POST', 'storage-addons', { body: { label: 'API Test 10 GB {{$timestamp}}', extraBytes: 10737418240, price: 99, currency: 'INR', interval: 'annual', isActive: true, order: 0 }, capture: { storageAddonId: 'data._id' }, statuses: [201] }),
  endpoint('Update Storage Add-on', 'PUT', 'storage-addons/:id', { body: { label: 'Updated API Test Storage', price: 99 } }),
  endpoint('Activate / Deactivate Storage Add-on', 'PATCH', 'storage-addons/:id/status', { body: { isActive: false } }),

  endpoint('Statistics Overview', 'GET', 'stats/overview', { query: [{ key: 'activeDays', value: '30' }, { key: 'trendMonths', value: '6' }] }),
  endpoint('Revenue & Trend', 'GET', 'stats/revenue', { query: [{ key: 'trendMonths', value: '6' }] }),
  endpoint('List App Customers', 'GET', 'users', { query: search }),
  endpoint('Search App Customers', 'POST', 'users/search', { body: { filters, page: 1, limit: 20 } }),
  endpoint('Get Customer Details', 'GET', 'users/:userId', { description: 'Header/general contact reads current owner Person contacts, matching the app and owner member row. Existing records need no new profile save.' }),
  endpoint('Update Customer Metadata', 'PATCH', 'users/:userId', { body: { occupation: 'API Test' }, description: 'For identity accounts, changed email/mobile must be verified through the app contact flow. Do not overwrite verified owner contacts using legacy-only admin metadata fields.' }),
  endpoint('Force Verify Business Ownership', 'POST', 'users/:userId/force-verify-business', { body: { reason: 'API test: ownership evidence reviewed.' } }),
  endpoint('Force Verify Owner Email', 'POST', 'users/:userId/force-verify-email', { body: { expectedEmail: '{{email}}', reason: 'API test: email evidence reviewed.' }, description: 'expectedEmail must be the exact current owner email shown in Get Customer Details; a stale email returns 409.' }),
  endpoint('Block Customer', 'PATCH', 'users/:userId/block', { body: { reason: 'API test: temporary account block.' } }),
  endpoint('Unblock Customer', 'PATCH', 'users/:userId/unblock', { body: { reason: 'API test completed.' } }),
  endpoint('Reset Customer Attempts', 'POST', 'users/:userId/unlock', { body: { reason: 'API test: reset verification attempts.' } }),
  endpoint('Unlock Identifier', 'POST', 'users/unlock-identifier', { body: { identifier: '{{identifier}}', reason: 'API test: reviewed identifier lock.' } }),
  endpoint('Check Identifier', 'GET', 'users/check-identifier/:identifier'),
  endpoint('Update Customer Module Access', 'PATCH', 'users/:userId/modules', { body: { gst: true, roc: true, tds: true, itr: true, investment: true } }),
  endpoint('Get Customer Team', 'GET', 'users/:userId/team'),
  endpoint('Set Customer Seat Override', 'PATCH', 'users/:userId/team/seats', { body: { seats: 10 }, description: 'seats: positive integer (max1000), -1 unlimited, or null to clear the override.' }),
  endpoint('Revoke Customer Team Member', 'DELETE', 'users/:userId/team/members/:membershipId', { body: { reason: 'API test: remove synthetic staff membership.' }, description: 'Cannot revoke the owner. Removes the selected membership and ends its workspace sessions.' }),
  endpoint('Cancel Customer Subscription', 'POST', 'users/:userId/cancel-subscription', { body: { reason: 'API test: customer requested cancellation.' } }),
  endpoint('Assign Customer Custom Plan', 'POST', 'users/:userId/custom-plan', { body: { ...planBody, name: 'API Test Custom Plan {{$timestamp}}' }, capture: { planId: 'data._id' }, statuses: [201] }),
  endpoint('Refund Payment', 'POST', 'payments/:paymentId/refund', { body: { amount: 1, reason: 'API test refund.' }, description: 'Real payment-provider operation. amount is rupees; omit amount for full refund. Use a refundable test-mode payment.' }),
  endpoint('Admin Audit Log', 'GET', 'audit-logs', { query: page }),

  endpoint('Create Saved User Search', 'POST', 'saved-searches', { body: { name: 'API Test Search {{$timestamp}}', filters }, capture: { savedSearchId: 'data._id' }, statuses: [201] }),
  endpoint('List Saved User Searches', 'GET', 'saved-searches'),
  endpoint('Get Saved User Search', 'GET', 'saved-searches/:savedSearchId'),
  endpoint('Update Saved User Search', 'PATCH', 'saved-searches/:savedSearchId', { body: { name: 'Updated API Test Search', filters } }),
  endpoint('Delete Saved User Search', 'DELETE', 'saved-searches/:savedSearchId'),
  endpoint('Execute Saved User Search', 'POST', 'saved-searches/:savedSearchId/execute', { body: { page: 1, limit: 20 } }),

  endpoint('Notification History', 'GET', 'notifications', { query: page }),
  endpoint('Preview Notification Audience', 'POST', 'notifications/broadcast/preview', { body: { filters: { planTypes: ['trial'], joinedDaysAgo: 30 } }, description: 'Read-only audience preview; sends nothing.' }),
  endpoint('Broadcast Notification', 'POST', 'notifications/broadcast', { body: { title: 'Foldy service update', message: 'Some Foldy services are temporarily unavailable. Please try again later. Thank you for your patience.' }, description: 'Sends an actual push to all eligible registered users when filters are omitted. Preview and select a test audience before sending.' }),
  endpoint('Send Customer Notification', 'POST', 'notifications/users/:userId', { body: { title: 'Foldy test notification', message: 'This is a notification from your API testing session.' } }),

  endpoint('List Feature Sections', 'GET', 'features', { description: 'Canonical whole-feature switches. Numeric IDs: GST1, ROC3, TDS4, DigiLocker5, Bank/Investments6, Income Tax7, Other Filings9. Stored killSwitch=true means available; false means blocked.' }),
  endpoint('Create Feature (catalog-managed refusal)', 'POST', 'features', { body: { title: 'API Test Feature', apiProvider: 'All providers', description: 'Catalog-managed sections cannot be created manually.' }, description: 'Compatibility route: always409 because feature sections are managed by the application catalog.', statuses: [409] }),
  endpoint('Toggle Whole Feature', 'PATCH', 'features/:id/toggle', { body: { killSwitch: false, notifyUsers: false, status: 'disabled-manual' }, description: 'false BLOCKS the whole feature. true RESTORES it. notifyUsers=true optionally queues one incident push to all registered users when blocking, and requires notifications.create. Default example sends no push.' }),
  endpoint('Update Feature Description / Availability', 'PUT', 'features/:id', { body: { description: 'API test availability note.' }, description: 'Only description and killSwitch are accepted; title/provider/scope/status cannot be changed here.' }),
  endpoint('Delete Feature (catalog-managed refusal)', 'DELETE', 'features/:id', { description: 'Compatibility route: always409. Feature sections cannot be deleted; use the toggle.', statuses: [409] }),

  endpoint('List Credit Costs', 'GET', 'credits/costs'),
  endpoint('Update Credit Cost', 'PUT', 'credits/costs', { body: { module: 'gst', action: 'refresh', creditCost: 1, freshnessMinutes: 360, description: 'API test price.' } }),
  endpoint('List Credit Packs', 'GET', 'credits/packs'),
  endpoint('Create Credit Pack', 'POST', 'credits/packs', { body: { module: 'pool', name: 'API Test Credit Pack {{$timestamp}}', credits: 20, price: 100, currency: 'INR', isActive: true }, capture: { packId: 'data._id' }, statuses: [201] }),
  endpoint('Update Credit Pack', 'PUT', 'credits/packs/:id', { body: { price: 100, isActive: false } }),
  endpoint('Delete Credit Pack', 'DELETE', 'credits/packs/:id'),
  endpoint('Get Credit Configuration', 'GET', 'credits/config'),
  endpoint('Update Credit Configuration', 'PUT', 'credits/config', { body: { lowBalanceTokens: 10, confirmAboveTokens: 5 } }),
  endpoint('Get Customer Credits', 'GET', 'credits/users/:userId'),
  endpoint('Get Customer Credit Ledger', 'GET', 'credits/users/:userId/ledger', { query: [{ key: 'limit', value: '50' }] }),
  endpoint('Adjust Customer Credits', 'PATCH', 'credits/users/:userId', { body: { delta: 1, bucket: 'topup', note: 'API test adjustment.' } }),

  endpoint('List Calendar Events', 'GET', 'calendar', { query: [{ key: 'month', value: '{{calendarMonth}}', description: 'YYYY-MM.' }] }),
  endpoint('Create Calendar Event', 'POST', 'calendar', { body: { title: 'API Test Event {{$timestamp}}', date: '{{calendarDate}}', timeStart: '09:00', timeEnd: '10:00', status: 'pending', eventType: 'event' }, capture: { eventId: 'data._id' }, statuses: [201] }),
  endpoint('Update Calendar Event', 'PUT', 'calendar/:id', { body: { title: 'Updated API Test Event' } }),
  endpoint('Delete Calendar Event', 'DELETE', 'calendar/:id'),
  endpoint('Bulk Create Calendar Events', 'POST', 'calendar/bulk', { body: { events: [{ title: 'API Test Bulk Event {{$timestamp}}', date: '{{calendarDate}}', timeStart: '09:00', timeEnd: '10:00' }] }, statuses: [201] }),
  endpoint('Import Previous Year Events', 'POST', 'calendar/import-previous-year', { body: { targetMonth: '{{calendarMonth}}' }, statuses: [201] }),
  endpoint('Calendar Import Template', 'GET', 'calendar/import/template'),
  endpoint('Import Calendar Sheet', 'POST', 'calendar/import', { formdata: [{ key: 'file', type: 'file', description: 'Select .xlsx, .xls or .csv; max5MB.' }], query: [{ key: 'dryRun', value: 'true' }], description: 'Download the import template first. dryRun=true validates without creating events.' }),
  endpoint('Upload Compliance Deadlines', 'POST', 'calendar/upload-compliance', { formdata: [{ key: 'file', type: 'file', description: 'Select JSON or XLSX compliance deadlines; max5MB.' }], statuses: [201] }),

  endpoint('Report Data Sources', 'GET', 'reports/data-sources'),
  endpoint('Preview Report', 'POST', 'reports/preview', { body: { definition: reportDefinition, page: 1, noCache: false } }),
  endpoint('Export Report CSV', 'POST', 'reports/export', { body: { definition: reportDefinition }, description: 'Streams CSV rather than an API JSON envelope. Save response to a file in Postman.' }),
  endpoint('Create Report', 'POST', 'reports', { body: { reportName: 'API Test Users Report {{$timestamp}}', definition: reportDefinition, published: false, userScoped: false }, capture: { reportId: 'data._id' }, statuses: [201] }),
  endpoint('List Reports', 'GET', 'reports', { query: search }),
  endpoint('Report Dashboard Statistics', 'GET', 'reports/dashboard'),
  endpoint('Published Reports', 'GET', 'reports/published'),
  endpoint('Get Report Definition', 'GET', 'reports/:reportId'),
  endpoint('Run Saved Report', 'GET', 'reports/:reportId/data', { query: [{ key: 'page', value: '1' }, { key: 'noCache', value: 'false' }] }),
  endpoint('Update Report', 'PATCH', 'reports/:reportId', { body: { reportName: 'Updated API Test Report', published: false } }),
  endpoint('Delete Report', 'DELETE', 'reports/:reportId'),
  endpoint('Cron Status', 'GET', 'crons/status'),
  endpoint('Cron Runs', 'GET', 'crons/runs', { query: page }),
  endpoint('Cron Run Detail', 'GET', 'crons/runs/:id'),
  endpoint('Run Cron Manually', 'POST', 'crons/:name/run', { body: { force: false }, description: 'Use a manually runnable name from Cron Status. This runs real maintenance work and may send notifications; inspect the selected job first.' }),

  endpoint('List Support Assignees', 'GET', 'support/assignees', { query: search }),
  endpoint('Support Unread Count', 'GET', 'support/unread-count'),
  endpoint('Support Queue Statistics', 'GET', 'support/stats'),
  endpoint('Preview Support Retention Purge', 'POST', 'support/retention/purge', { body: { dryRun: true }, description: 'Default example is a dry-run. Actual purging requires dryRun=false and the server confirmation string.' }),
  endpoint('List Support Tickets', 'GET', 'support/queries', { query: [...search, { key: 'archived', value: 'false' }] }),
  endpoint('Get Support Ticket', 'GET', 'support/queries/:id'),
  endpoint('Update Support Ticket Status', 'PATCH', 'support/queries/:id/status', { body: { status: 'in_progress' } }),
  endpoint('Reply to Support Ticket', 'POST', 'support/queries/:id/responses', { body: { response: 'API test response: we are reviewing your request.' }, statuses: [201] }),
  endpoint('Add Support Internal Note', 'POST', 'support/queries/:id/internal-notes', { body: { note: 'API test internal note.' }, statuses: [201] }),
  endpoint('Assign Support Ticket', 'PATCH', 'support/queries/:ticketId/assignee', { body: { adminId: '{{adminUserId}}' }, description: 'adminId may be null to clear assignment.' }),
  endpoint('Update Support Assignment', 'PATCH', 'support/queries/:id/assignment', { body: { assignedTo: '{{adminUserId}}' }, description: 'assignedTo may be null to clear assignment; this payload differs from /assignee.' }),
  endpoint('Update Support Metadata', 'PATCH', 'support/queries/:id/metadata', { body: { priority: 'high', tags: ['api-test'] } }),
  endpoint('Mark Support Ticket Read', 'PATCH', 'support/queries/:id/read'),
  endpoint('Archive Support Ticket', 'PATCH', 'support/queries/:id/archive', { body: { archived: true, reason: 'API test completed.', retentionDays: 365 } }),
  endpoint('Upload Support Attachment', 'POST', 'support/queries/:id/attachments', { formdata: [{ key: 'file', type: 'file', description: 'Choose a supported test attachment.' }, { key: 'message', value: 'API test attachment.' }, { key: 'visibility', value: 'public' }], statuses: [201] }),
  endpoint('Download Support Attachment', 'GET', 'support/queries/:id/attachments/:attachmentId/download'),
  endpoint('Delete Support Attachment', 'DELETE', 'support/queries/:id/attachments/:attachmentId'),
  endpoint('Create Support Response Template', 'POST', 'support/response-templates', { body: { title: 'API Test Template {{$timestamp}}', body: 'Thank you. We are reviewing your request.', tags: ['api-test'], isActive: true }, capture: { supportTemplateId: 'data.template._id' }, statuses: [201] }),
  endpoint('List Support Response Templates', 'GET', 'support/response-templates', { query: [...search, { key: 'active', value: 'true' }] }),
  endpoint('Get Support Response Template', 'GET', 'support/response-templates/:templateId'),
  endpoint('Update Support Response Template', 'PATCH', 'support/response-templates/:templateId', { body: { title: 'Updated API Test Template' } }),
  endpoint('Delete Support Response Template', 'DELETE', 'support/response-templates/:templateId'),
  endpoint('List Feature Requests', 'GET', 'feature-requests', { query: page }),
  endpoint('Feature Request Options', 'GET', 'feature-requests/available'),
];

const byRoute = new Map(definitions.map(ep => [`${ep.method} ${ep.path}`, ep]));

/** Also used for admin endpoints displayed in the support/credits sections. */
export function patchAdminEndpoint(ep: PmEndpoint): PmEndpoint {
  if (!ep.path.startsWith(prefix)) return ep;
  const replacement = byRoute.get(`${ep.method} ${ep.path}`);
  return replacement ? { ...ep, ...replacement } : { ...ep, auth: 'admin' } as AdminEndpoint;
}

export function completeAdminCatalog(existing: PmEndpoint[]): PmEndpoint[] {
  const result = existing.map(patchAdminEndpoint);
  const known = new Set(result.map(ep => `${ep.method} ${ep.path}`));
  for (const ep of definitions) if (!known.has(`${ep.method} ${ep.path}`)) result.push(ep);
  return result;
}
