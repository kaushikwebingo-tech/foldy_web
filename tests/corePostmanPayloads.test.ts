import assert from 'node:assert/strict';
import test from 'node:test';
import * as signIn from '../../server/src/validations/signInValidation.ts';
import * as signup from '../../server/src/validations/signupValidation.ts';
import * as contact from '../../server/src/validations/selfContactValidation.ts';
import * as stepUp from '../../server/src/validations/stepUpValidation.ts';
import { CORE_ENDPOINTS, workflowSections } from '../scripts/postmanScenarios.ts';
const schemas: Record<string, any> = {
  'auth/login': signIn.signInSchema, 'auth/login/device': signIn.deviceCodeSchema,
  'auth/login/device/resend': signIn.deviceResendSchema, 'auth/workspace/switch': signIn.workspaceSwitchSchema,
  'auth/step-up/start': stepUp.stepUpStartSchema, 'auth/step-up/verify': stepUp.stepUpVerifySchema,
  'auth/email/verify': signIn.emailVerifySchema,
  'signup/mobile': signup.signupMobileSchema, 'signup/mobile/resend': signup.signupTokenSchema,
  'signup/mobile/verify': signup.signupVerifySchema, 'signup/kind': signup.signupKindSchema,
  'signup/identity/start': signup.signupTokenSchema, 'signup/identity/verify': signup.signupIdentityVerifySchema,
  'signup/complete': signup.signupCompleteSchema, 'signup/resume': signup.signupResumeSchema,
  'auth/contact/request': contact.contactRequestSchema, 'auth/contact/verify': contact.contactVerifySchema,
  'auth/contact/commit': contact.contactCommitSchema,
};
const values: Record<string, string> = {
  loginId: '9876500001', password: 'ApiTestPassword123!', deviceTrust: '', challengeToken: 'test-ticket', otp: '123456',
  tenantId: '111111111111111111111111', stepUpAction: 'auth.email.change', mobile: '9876500001',
  signupToken: 'synthetic-draft-token', digilockerSessionId: 'synthetic-provider-session', email: 'test@example.com',
  newEmail: 'replacement@example.com', newMobile: '9876500002', emailChallengeId: 'email-challenge', mobileChallengeId: 'mobile-challenge',
  emailProofId: 'email-proof', mobileProofId: 'mobile-proof',
};
const sample = (body: unknown) => JSON.parse(JSON.stringify(body).replace(/\{\{(\w+)\}\}/g, (_m, key) => values[key] ?? 'synthetic-test-value'));
for (const endpoint of CORE_ENDPOINTS) {
  const schema = schemas[endpoint.path.replace(/^api\/v1\//, '')];
  if (!schema) continue;
  test(`guided core payload: ${endpoint.path}`, () => {
    const { error } = schema.validate(sample(endpoint.body));
    assert.equal(error, undefined, error?.message);
  });
}
test('guided signup omits businessType for an individual and contact workflows prove only their changed field', () => {
  const flows = workflowSections();
  const kind = flows.find(f => f.key === 'flow-signup')!.endpoints.find(e => e.path.endsWith('/kind'))!;
  assert.equal(signup.signupKindSchema.validate(sample(kind.body)).error, undefined);
  for (const field of ['email', 'mobile']) {
    const save = flows.find(f => f.key === `flow-${field}`)!.endpoints.find(e => e.path.endsWith('/contact/commit'))!;
    assert.equal(contact.contactCommitSchema.validate(sample(save.body)).error, undefined);
    assert.deepEqual(Object.keys(save.body!).sort(), [field, `${field}ProofId`].sort());
  }
});
