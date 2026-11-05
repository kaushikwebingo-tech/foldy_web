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
  'supportValidation', 'adminLeadValidation', 'adminFeatureRequestValidation',
  'adminTeamValidation', 'adminCronValidation',
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
 'PATCH feature-requests/:id/status':'decideFeatureRequestSchema',
 'DELETE users/:userId/team/members/:membershipId':'revokeTeamMemberSchema','PATCH users/:userId/team/seats':'teamSeatsSchema',
 'POST crons/:name/run':'runCronNowSchema',
 'PATCH leads/:id/follow-up':'leadFollowUpSchema','POST leads/:id/notes':'leadNoteSchema',
 'POST support/retention/purge':'purgeSupportRetentionSchema','PATCH support/queries/:id/status':'updateSupportStatusSchema','POST support/queries/:id/responses':'addSupportResponseSchema','POST support/queries/:id/internal-notes':'addInternalNoteSchema','PATCH support/queries/:ticketId/assignee':'updateSupportAssigneeSchema','PATCH support/queries/:id/assignment':'updateSupportAssignmentSchema','PATCH support/queries/:id/metadata':'updateSupportMetadataSchema','PATCH support/queries/:id/archive':'archiveSupportQuerySchema','POST support/response-templates':'createSupportTemplateSchema','PATCH support/response-templates/:templateId':'updateSupportTemplateSchema'
};

/*
 * Query validators are `.unknown(false)`, so a catalog filter the server does
 * not accept is a 400 the tester would meet before any data came back. Only
 * enabled parameters are sent, and the generator disables every blank one.
 */
const querySchemasByRoute: Record<string, string> = {
  'GET leads': 'listLeadsSchema',
  'GET leads/stats': 'leadStatsSchema',
  'GET feature-requests': 'listFeatureRequestsSchema',
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

/*
 * Every admin-mounted request, wherever it is catalogued. Reading only
 * API_SECTIONS.admin missed the admin feature-request endpoints, which sit in
 * the support section beside the customer-facing ones they belong with.
 */
const ADMIN_PREFIX = 'api/admin/v1/';
const endpoints = Object.values(API_SECTIONS).flatMap(section =>
  section.endpoints.filter(endpoint => endpoint.path.startsWith(ADMIN_PREFIX)),
);
const routeOf = (endpoint: { method: string; path: string }) =>
  `${endpoint.method} ${endpoint.path.replace(ADMIN_PREFIX, '')}`;

/*
 * One route may be catalogued as several NAMED variants (broadcast to everyone
 * vs to a targeted audience), and admin routes are deliberately mirrored into
 * the domain sections they belong with. What must never happen is the same
 * route under the same name twice: that is a copy-paste, and it renders as a
 * duplicate request in the API console.
 */
test('no admin request is catalogued twice under one name', () => {
  for (const [key, section] of Object.entries(API_SECTIONS)) {
    const named = section.endpoints
      .filter(endpoint => endpoint.path.startsWith(ADMIN_PREFIX))
      .map(endpoint => `${routeOf(endpoint)} :: ${endpoint.name}`);
    assert.equal(new Set(named).size, named.length, `Duplicate admin request in section ${key}`);
  }
  const routes = endpoints.map(routeOf);
  assert.ok(routes.includes('PATCH feature-requests/:id/status'));
  assert.ok(routes.includes('PATCH leads/:id/follow-up'));
  assert.ok(routes.includes('GET leads/stats'));
});

test('every validated admin example still refers to a catalog request', () => {
  const routes = new Set(endpoints.map(routeOf));
  for (const route of [...Object.keys(schemasByRoute), ...Object.keys(querySchemasByRoute)]) {
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

for (const endpoint of endpoints) {
  const schemaName = querySchemasByRoute[routeOf(endpoint)];
  if (!schemaName) continue;
  test(`admin query: ${routeOf(endpoint)} (${endpoint.name})`, () => {
    const schema = schemas[schemaName];
    assert.ok(schema, `Unknown server validator: ${schemaName}`);
    const sent = Object.fromEntries(
      (endpoint.query ?? []).filter(field => field.value).map(field => [field.key, field.value!]),
    );
    const result = schema.validate(sent);
    assert.equal(result.error, undefined, `${routeOf(endpoint)}: ${result.error?.message}`);
    // Every documented filter must still be a key the server accepts.
    for (const field of endpoint.query ?? []) {
      const probe = schema.validate({ [field.key]: field.value || undefined });
      assert.doesNotMatch(probe.error?.message ?? '', /is not allowed$/, `${field.key} is no longer accepted`);
    }
  });
}

/*
 * Admin ROLE routes carry no Joi schema: adminRoleService validates them by
 * hand against the permission catalog. Checking the examples against those same
 * exported constants keeps them honest without inventing a schema here, which
 * would only test a copy of the rules rather than the rules themselves.
 */
const { normalizeAdminPermissions, VALID_ADMIN_MODULE_ACCESS } =
  await import('../../server/src/constants/adminPermissions.ts');
const MODULE_KEYS: ReadonlySet<string> = new Set(VALID_ADMIN_MODULE_ACCESS);

const assertModuleAccess = (moduleAccess: Record<string, unknown>, where: string) => {
  for (const [module, enabled] of Object.entries(moduleAccess)) {
    assert.ok(MODULE_KEYS.has(module), `${where}: ${module} is not a supported module`);
    assert.equal(typeof enabled, 'boolean', `${where}: ${module} must be true or false`);
  }
};

test('admin role examples satisfy the rules adminRoleService enforces', () => {
  const byRoute = new Map(endpoints.map(endpoint => [routeOf(endpoint), endpoint]));

  const create = byRoute.get('POST roles');
  assert.ok(create, 'Missing admin request: POST roles');
  const createBody = exampleBody(create.body) as Record<string, any>;
  assert.ok(String(createBody.name ?? '').trim(), 'a role needs a name');
  // The service refuses a role whose permissions all normalise away.
  assert.ok(
    normalizeAdminPermissions(createBody.permissions).length > 0,
    'POST roles: none of the example permissions survive normalisation',
  );
  assert.deepEqual(
    normalizeAdminPermissions(createBody.permissions),
    createBody.permissions,
    'POST roles: example permissions are renamed or dropped by normalisation',
  );
  assertModuleAccess(createBody.moduleAccess ?? {}, 'POST roles');

  const update = byRoute.get('PATCH roles/:id');
  assert.ok(update, 'Missing admin request: PATCH roles/:id');
  const updateBody = exampleBody(update.body) as Record<string, any>;
  if (updateBody.permissions !== undefined) {
    assert.ok(normalizeAdminPermissions(updateBody.permissions).length > 0);
  }
  assertModuleAccess(updateBody.moduleAccess ?? {}, 'PATCH roles/:id');

  // This one posts the module map itself, not a { moduleAccess } wrapper.
  const access = byRoute.get('PATCH roles/:id/module-access');
  assert.ok(access, 'Missing admin request: PATCH roles/:id/module-access');
  assertModuleAccess(exampleBody(access.body) as Record<string, unknown>, 'PATCH roles/:id/module-access');
});

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
  // A decided request must never be reopened, and an empty follow-up patch
  // must not be read as "change nothing" and stored as a no-op write.
  ['decideFeatureRequestSchema', { status: 'pending' }],
  ['leadFollowUpSchema', {}],
  ['leadFollowUpSchema', { disposition: 'contacted', mobile: '9876501234' }],
  ['leadNoteSchema', { body: '   ' }],
  // A comma-joined stage list is refused, not split.
  ['listLeadsSchema', { stage: 'mobile_sent,kind_chosen' }],
  ['listLeadsSchema', { limit: 101 }],
  ['leadStatsSchema', { stage: 'mobile_sent' }],
  // Seats must be stated outright: a missing value is not "leave it alone",
  // and 0 would mean a team nobody can join.
  ['teamSeatsSchema', {}],
  ['teamSeatsSchema', { seats: 0 }],
  ['teamSeatsSchema', { seats: 2.5 }],
  ['teamSeatsSchema', { seats: -2 }],
  ['revokeTeamMemberSchema', { reason: 'x'.repeat(501) }],
  ['runCronNowSchema', { force: 'yes-please' }],
] as const) {
  test(`admin validation rejects obsolete ${schemaName} payload`, () => {
    assert.ok(schemas[schemaName]!.validate(payload).error);
  });
}
