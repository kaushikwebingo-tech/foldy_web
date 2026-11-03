import test from 'node:test';
import assert from 'node:assert/strict';
import '../../server/src/tests/testEnv.ts';
import { APP_API_SUPPLEMENT } from '../src/lib/appApiSupplement.ts';
import * as contacts from '../../server/src/validations/selfContactValidation.ts';
import * as reset from '../../server/src/validations/passwordResetValidation.ts';
import * as signin from '../../server/src/validations/signInValidation.ts';
import * as staff from '../../server/src/validations/contactChangeValidation.ts';
import * as staffActions from '../../server/src/validations/staffValidation.ts';
import * as roles from '../../server/src/validations/tenantRoleValidation.ts';
import * as signup from '../../server/src/validations/signupValidation.ts';
import * as vault from '../../server/src/validations/vaultValidation.ts';
import * as income from '../../server/src/integrations/incometax/incometax.validation.ts';
import * as gst from '../../server/src/integrations/gst/gst.validation.ts';
import * as tds from '../../server/src/validations/tdsValidation.ts';

const schemas = {
  'POST api/v1/auth/contact/request': contacts.contactRequestSchema,
  'POST api/v1/auth/contact/verify': contacts.contactVerifySchema,
  'POST api/v1/auth/contact/commit': contacts.contactCommitSchema,
  'POST api/v1/auth/reverify/start': signin.reverifyStartSchema,
  'POST api/v1/auth/reverify/verify': signin.reverifyVerifySchema,
  'POST api/v1/auth/password/reset/start': reset.resetStartSchema,
  'POST api/v1/auth/password/reset/resend': reset.resetResendSchema,
  'POST api/v1/auth/password/reset/verify': reset.resetVerifySchema,
  'POST api/v1/auth/password/reset/cancel': reset.resetCancelSchema,
  'POST api/v1/auth/password/reset/complete': reset.resetCompleteSchema,
  'POST api/v1/auth/password/first-set': reset.firstSetPasswordSchema,
  'POST api/v1/auth/password/change': reset.passwordChangeSchema,
  'POST api/v1/auth/account/restore': signin.accountRestoreSchema,
  'POST api/v1/auth/account/close': signin.accountCloseSchema,
  'POST api/v1/team/contact-change/confirm': staff.contactChangeConfirmSchema,
  'POST api/v1/team/contact-change/verify': staff.contactChangeVerifySchema,
  'POST api/v1/signup/company-pan/verify': signup.signupCompanyVerifySchema,
  'POST api/v1/team/roles': roles.roleCreateSchema,
  'PATCH api/v1/team/roles/:id': roles.roleUpdateSchema,
  'POST api/v1/team/staff/:id/contact-change': staff.contactChangeProposeSchema,
  'POST api/v1/team/staff': staffActions.staffCreateSchema,
  'PATCH api/v1/team/staff/:id/role': staffActions.staffRoleChangeSchema,
  'POST api/v1/team/staff/:id/suspend': staffActions.staffSuspendSchema,
  'POST api/v1/team/staff/:id/reactivate': staffActions.staffReactivateSchema,
  'POST api/v1/team/staff/:id/setup/resend': staffActions.staffResendSetupSchema,
  'DELETE api/v1/team/staff/:id': staffActions.staffRemoveSchema,
  'POST api/v1/vault/folders': vault.createFolderSchema,
  'POST api/v1/vault/bulk': vault.bulkSchema,
  'POST api/v1/b2b/gst/profiles': gst.createGstProfileSchema,
  'POST api/v1/b2b/gst/profiles/:id/authorize/verify': gst.verifyProfileOtpSchema,
  'POST api/v1/b2b/tds/profiles': tds.createTdsProfileSchema,
  'POST api/v1/b2b/tds/certificates/:form': tds.createCertificateJobSchema,
  'POST api/v1/income-tax/itr-client': income.createItrClientSchema,
  'POST api/v1/income-tax/:itType': income.render26asSchema,
} as const;
const values: Record<string, string> = {
  newEmail: 'api-test@example.com', emailChallengeId: '111111111111111111111111',
  otp: '123456', providerOtp: '654321', emailProofId: '111111111111111111111111',
  reverifyToken: 'private-test-token-at-least-20-characters', reverifyChallengeToken: 'private-test-ticket',
  resetTicket: 'private-test-ticket', loginId: 'api-test@example.com', newPassword: 'FoldyApiTest!2026',
  noticeVersion: '2026-11-02', password: 'FoldyApiTest!2025',
  staffContactChallengeId: '111111111111111111111111', signupToken: 'private-signup-draft', companyPan: 'AAACA1234A',
  roleId: '222222222222222222222222', staffMobile: '9876500001', staffEmail: 'api-staff@example.com',
  fileId: '333333333333333333333333', gstin: '29ABCDE1234F1Z5', gstUsername: 'api_test_gst',
  tan: 'MUMB01234F', tracesUsername: 'api_test_traces', tracesPassword: 'SyntheticOnly!2026',
  tdsProfileId: '444444444444444444444444', taxYear: 'TY 2026-27', pan: 'ABCDE1234F',
  portalPassword: 'SyntheticPortal!2026', statementJsonUrl: 'https://example.test/statement.json', financialYear: '2025-26',
};
const endpoints = APP_API_SUPPLEMENT.flatMap(section => section.endpoints);
const replace = (body: unknown) => JSON.parse(JSON.stringify(body).replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
  assert.ok(values[key], `Missing synthetic validator fixture for ${key}`);
  return values[key]!;
}));

for (const endpoint of endpoints) {
  const schema = schemas[`${endpoint.method} ${endpoint.path}` as keyof typeof schemas];
  if (!schema || !endpoint.body) continue;
  test(`supplement body matches actual server validation: ${endpoint.method} ${endpoint.path}`, () => {
    assert.equal(schema.validate(replace(endpoint.body)).error, undefined);
  });
}

test('both file upload requests include an actual multipart file field', () => {
  for (const path of ['api/v1/vault/files', 'api/v1/manual-uploads/:category/upload']) {
    const request = endpoints.find(endpoint => endpoint.method === 'POST' && endpoint.path === path)!;
    assert.equal(request.body, undefined);
    assert.equal(request.formdata?.find(field => field.key === 'file')?.type, 'file');
  }
});

test('known retired legacy contact requests expect409 rather than reporting a successful OTP', () => {
  for (const path of ['api/v1/user/profile/contact/request-otp', 'api/v1/user/profile/contact/verify']) {
    assert.deepEqual(endpoints.find(endpoint => endpoint.path === path)?.statuses, [409]);
  }
});

test('provider GST OTP is independent from the Foldy code fixture', () => {
  const request = endpoints.find(endpoint => endpoint.path === 'api/v1/b2b/gst/profiles/:id/authorize/verify')!;
  assert.deepEqual(request.body, { otp: '{{providerOtp}}' });
  assert.notEqual(values.providerOtp, values.otp);
});

test('supplement does not duplicate method-path keys or include destructive devadmin tooling', () => {
  const keys = endpoints.map(endpoint => `${endpoint.method} ${endpoint.path}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!endpoints.some(endpoint => endpoint.path.includes('/devadmin')));
});
