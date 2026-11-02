import assert from 'node:assert/strict';
import test from 'node:test';
import '../../server/src/tests/testEnv.ts';
import { API_SECTIONS } from '../src/lib/apiCatalog.ts';

// Import validators only: these tests never connect to a database or invoke
// controllers, providers, OTP delivery, payments or notification services.
type ValidationSchema = { validate(value: unknown): { error?: { message: string } } };
const schemas: Record<string, ValidationSchema> = {};
for (const file of [
  'adminAuthValidation', 'adminUserValidation', 'adminManagementValidation',
  'adminSavedSearchValidation', 'adminReportValidation', 'reportEngineValidation',
  'planValidation', 'storageAddonValidation', 'creditValidation',
  'notificationValidation', 'adminFeatureValidation', 'adminCalendarValidation',
  'supportValidation',
]) {
  Object.assign(schemas, await import(`../../server/src/validations/${file}.ts`));
}

const schemasByRoute: Record<string, string> = {
 'POST auth/login':'loginSchema','POST auth/register':'registerSchema','POST auth/forgot-password':'forgotPasswordSchema','POST auth/verify-email-otp':'verifyEmailOtpSchema','POST auth/update-password':'updatePasswordSchema','POST auth/change-password':'changePasswordSchema',
 'POST admin-users':'createAdminSchema','PATCH admin-users/:id':'updateAdminSchema','PATCH admin-users/:id/role':'changeAdminRoleSchema',
 'POST plans':'createPlanSchema','PUT plans/:id':'updatePlanSchema','PATCH plans/:id/status':'planStatusSchema',
 'POST storage-addons':'createStorageAddonSchema','PUT storage-addons/:id':'updateStorageAddonSchema','PATCH storage-addons/:id/status':'storageAddonStatusSchema',
 'POST users/search':'advancedUserSearchSchema','PATCH users/:userId':'updateUserSchema','POST users/:userId/force-verify-business':'forceVerifyBusinessSchema','POST users/:userId/force-verify-email':'forceVerifyEmailSchema','PATCH users/:userId/block':'blockUserSchema','PATCH users/:userId/unblock':'blockUserSchema','POST users/:userId/unlock':'unlockUserSchema','POST users/unlock-identifier':'unlockIdentifierSchema','PATCH users/:userId/modules':'updateModulesSchema','POST users/:userId/cancel-subscription':'cancelSubscriptionSchema','POST users/:userId/custom-plan':'createPlanSchema','POST payments/:paymentId/refund':'refundSchema',
 'POST saved-searches':'createSavedSearchSchema','PATCH saved-searches/:savedSearchId':'updateSavedSearchSchema','POST saved-searches/:savedSearchId/execute':'executeSavedSearchSchema',
 'POST notifications/broadcast/preview':'broadcastAudienceSchema','POST notifications/broadcast':'broadcastNotificationSchema','POST notifications/users/:userId':'sendUserNotificationSchema',
 'POST features':'createFeatureSchema','PATCH features/:id/toggle':'toggleFeatureSchema','PUT features/:id':'updateFeatureSchema',
 'PUT credits/costs':'updateCreditCostSchema','POST credits/packs':'createCreditPackSchema','PUT credits/packs/:id':'updateCreditPackSchema','PUT credits/config':'updateCreditConfigSchema','PATCH credits/users/:userId':'adminAdjustCreditsSchema',
 'POST calendar':'createEventSchema','PUT calendar/:id':'updateEventSchema','POST calendar/bulk':'bulkCreateSchema','POST calendar/import-previous-year':'importPreviousYearSchema',
 'POST reports/preview':'previewReportSchema','POST reports/export':'previewReportSchema','POST reports':'createAdminReportSchema','PATCH reports/:reportId':'updateAdminReportSchema',
 'POST support/retention/purge':'purgeSupportRetentionSchema','PATCH support/queries/:id/status':'updateSupportStatusSchema','POST support/queries/:id/responses':'addSupportResponseSchema','POST support/queries/:id/internal-notes':'addInternalNoteSchema','PATCH support/queries/:ticketId/assignee':'updateSupportAssigneeSchema','PATCH support/queries/:id/assignment':'updateSupportAssignmentSchema','PATCH support/queries/:id/metadata':'updateSupportMetadataSchema','PATCH support/queries/:id/archive':'archiveSupportQuerySchema','POST support/response-templates':'createSupportTemplateSchema','PATCH support/response-templates/:templateId':'updateSupportTemplateSchema'
};

const variables: Record<string, string> = {
  '$timestamp': '1762100000',
  adminEmail: 'admin-api-test@example.com',
  adminPassword: 'ApiTestPassword123!',
  adminNewPassword: 'DifferentApiTestPassword123!',
  adminEmployeeEmail: 'employee-api-test@example.com',
  adminEmployeePassword: 'ApiTestEmployeePassword123!',
  adminEmployeePhone: '9876501234',
  adminRoleId: '111111111111111111111111',
  adminUserId: '222222222222222222222222',
  calendarDate: '2026-11-02',
  calendarMonth: '2026-11',
  email: 'owner-api-test@example.com',
  identifier: '9876501234',
  identifierStepUp: '9876501234',
  otp: '123456',
};

function exampleBody(body: unknown): unknown {
  assert.notEqual(body, undefined, 'A validated request must have an example body.');
  const rendered = JSON.stringify(body).replace(/\{\{([^{}]+)\}\}/g, (_match, name: string) => {
    assert.ok(Object.hasOwn(variables, name), `Add a synthetic test value for {{${name}}}.`);
    return variables[name]!;
  });
  return JSON.parse(rendered);
}

const endpoints = API_SECTIONS.admin!.endpoints;
const routeOf = (endpoint: { method: string; path: string }) =>
  `${endpoint.method} ${endpoint.path.replace('api/admin/v1/', '')}`;

test('every validated admin example still refers to a catalog request', () => {
  const routes = new Set(endpoints.map(routeOf));
  for (const route of Object.keys(schemasByRoute)) {
    assert.ok(routes.has(route), `Missing admin request: ${route}`);
  }
});

for (const endpoint of endpoints) {
  const route = routeOf(endpoint);
  const schemaName = schemasByRoute[route];
  if (!schemaName) continue;
  test(`admin payload: ${route} (${endpoint.name})`, () => {
    const schema = schemas[schemaName];
    assert.ok(schema, `Unknown server validator: ${schemaName}`);
    const result = schema.validate(exampleBody(endpoint.body));
    assert.equal(result.error, undefined, `${route}: ${result.error?.message}`);
  });
}

// These historical payload mistakes must fail under the same real validators.
// The examples above should not start passing merely because validation was
// accidentally removed or a permissive stub replaced a server schema.
for (const [schemaName, payload] of [
  ['createAdminSchema', { fullName: 'Test Employee', email: 'employee@example.com', password: 'ApiTestPassword123!', role: 'admin' }],
  ['changeAdminRoleSchema', { role: 'superadmin' }],
  ['advancedUserSearchSchema', { query: '', filters: {} }],
  ['addSupportResponseSchema', { message: 'Old reply field.' }],
  ['updateSupportAssignmentSchema', { assigneeId: '222222222222222222222222' }],
  ['archiveSupportQuerySchema', {}],
] as const) {
  test(`admin validation rejects obsolete ${schemaName} payload`, () => {
    assert.ok(schemas[schemaName]!.validate(payload).error);
  });
}
