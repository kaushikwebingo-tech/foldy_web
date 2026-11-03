import type { ApiSection, PmEndpoint } from '../src/lib/postmanCore';

export const SESSION_CAPTURE = [
  'if (pm.response.code >= 200 && pm.response.code < 300) {',
  '  const payload = pm.response.json();',
  '  const d = payload.success === false ? {} : payload.data || {};',
  '  if (d.next) pm.collectionVariables.set("loginNext", d.next);',
  '  if (["device_code", "no_workspace", "restore_account", "set_password"].includes(d.next)) pm.collectionVariables.unset("token");',
  '  if (d.challengeToken) pm.collectionVariables.set("challengeToken", d.challengeToken);',
  '  if (d.deviceTrust) pm.collectionVariables.set("deviceTrust", d.deviceTrust);',
  '  if (d.token) {',
  '    const target = d.next === "restore_account" ? "restoreToken" : d.next === "set_password" ? "setPasswordToken" : "token";',
  '    pm.collectionVariables.set(target, d.token);',
  '  }',
  '  if (d.activeWorkspaceId) pm.collectionVariables.set("tenantId", d.activeWorkspaceId);',
  '  if (d.person && d.person.id) pm.collectionVariables.set("personId", d.person.id);',
  '}',
];
const ep = (name: string, method: PmEndpoint['method'], path: string, extra: Partial<PmEndpoint> = {}): PmEndpoint => ({ name, method, path: `api/v1/${path}`, ...extra });
const stepHeader = [{ key: 'X-Step-Up', value: '{{stepUpToken}}' }];
const signupCapture = { signupToken: 'data.token' };
export const CORE_ENDPOINTS: PmEndpoint[] = [
  ep('Sign in', 'POST', 'auth/login', { body: { loginId: '{{loginId}}', password: '{{password}}', deviceTrust: '{{deviceTrust}}' }, tests: SESSION_CAPTURE, description: 'Use mobile, email or Foldy username. If loginNext is device_code, verify the device code. restore_account and set_password tokens are kept separate from the app session token.' }),
  ep('Verify new device', 'POST', 'auth/login/device', { body: { challengeToken: '{{challengeToken}}', code: '{{otp}}', rememberDevice: true }, tests: SESSION_CAPTURE }),
  ep('Resend device OTP', 'POST', 'auth/login/device/resend', { body: { challengeToken: '{{challengeToken}}' }, capture: { challengeToken: 'data.challengeToken' } }),
  ep('Switch workspace', 'POST', 'auth/workspace/switch', { body: { tenantId: '{{tenantId}}' }, tests: SESSION_CAPTURE }),
  ep('Start step-up verification', 'POST', 'auth/step-up/start', { body: { action: '{{stepUpAction}}' }, description: 'Set stepUpAction to the exact action required by the target request, then verify its SMS code. Proofs can expire or be consumed.' }),
  ep('Verify step-up code', 'POST', 'auth/step-up/verify', { body: { action: '{{stepUpAction}}', code: '{{otp}}' }, capture: { stepUpToken: 'data.stepUpToken' } }),
  ep('Send initial email verification', 'POST', 'auth/email/resend', { body: {} }),
  ep('Verify initial email', 'POST', 'auth/email/verify', { body: { code: '{{otp}}' } }),
  ep('Start signup', 'POST', 'signup/mobile', { body: { mobile: '{{mobile}}' }, capture: signupCapture }),
  ep('Resend signup OTP', 'POST', 'signup/mobile/resend', { body: { token: '{{signupToken}}' }, capture: signupCapture }),
  ep('Verify signup mobile', 'POST', 'signup/mobile/verify', { body: { token: '{{signupToken}}', code: '{{otp}}' }, capture: signupCapture }),
  ep('Choose workspace kind', 'POST', 'signup/kind', { body: { token: '{{signupToken}}', kind: 'business', businessType: 'company' }, capture: signupCapture, description: 'For an individual use kind:"individual" and omit businessType. Business accepts company or proprietorship.' }),
  ep('Start DigiLocker consent', 'POST', 'signup/identity/start', { body: { token: '{{signupToken}}' }, capture: { authorizationUrl: 'data.authorizationUrl', digilockerSessionId: 'data.sessionId' }, description: 'Open authorizationUrl in a browser, complete provider consent, then run identity/verify. A real provider authorization cannot be completed by automatically running this collection.' }),
  ep('Verify DigiLocker identity', 'POST', 'signup/identity/verify', { body: { token: '{{signupToken}}', sessionId: '{{digilockerSessionId}}' }, description: 'Run after provider consent is completed. PAN-only identity requirements are enforced by the server; no Aadhaar document is requested by this collection.' }),
  ep('Complete signup', 'POST', 'signup/complete', { body: { token: '{{signupToken}}', email: '{{email}}', password: '{{password}}' }, capture: { token: 'data.token', personId: 'data.person.id', tenantId: 'data.tenant.id', workspaceCode: 'data.tenant.tenantCode', username: 'data.username' }, description: 'Creates the account only after the prior signup steps. Person ID and tenant ID are not the legacy admin userId. The generated username is returned, not chosen by the caller.' }),
  ep('Resume signup', 'POST', 'signup/resume', { body: { mobile: '{{mobile}}' }, capture: signupCapture }),
  ep('Request email change OTP', 'POST', 'auth/contact/request', { body: { field: 'email', value: '{{newEmail}}' }, capture: { emailChallengeId: 'data.challengeId' } }),
  ep('Verify email change OTP', 'POST', 'auth/contact/verify', { body: { challengeId: '{{emailChallengeId}}', code: '{{otp}}' }, capture: { emailProofId: 'data.proofId' } }),
  ep('Save verified email', 'POST', 'auth/contact/commit', { headers: stepHeader, body: { email: '{{newEmail}}', emailProofId: '{{emailProofId}}' }, description: 'Requires auth.email.change step-up when replacing a verified email. Only the changed field and its proof are sent. Use auth.mobile.change and mobile/mobileProofId for mobile; both changed fields require both proofs.' }),
  ep('Activity export', 'POST', 'account/audit/export', { headers: stepHeader, body: {}, capture: { activityExportUrl: 'data.url' }, description: 'First verify step-up action audit.export. The API returns a signed URL to JSON; the mobile app separately formats a PDF. Open activityExportUrl before it expires; no auth token should be forwarded to a storage host.' }),
];

const clone = (endpoint: PmEndpoint, name: string, patch: Partial<PmEndpoint> = {}): PmEndpoint => ({ ...endpoint, ...patch, name });
const core = (path: string) => CORE_ENDPOINTS.find(e => e.path === `api/v1/${path}`)!;
const requestStep = (action: string) => [
  clone(core('auth/step-up/start'), 'Start security code', { body: { action } }),
  clone(core('auth/step-up/verify'), 'Verify security code', { body: { action, code: '{{otp}}' } }),
];
export function workflowSections(): ApiSection[] {
  const contact = (field: 'email' | 'mobile'): ApiSection => {
    const label = field === 'email' ? 'Email' : 'Mobile';
    const prefix = field === 'email' ? 'email' : 'mobile';
    const value = field === 'email' ? '{{newEmail}}' : '{{newMobile}}';
    return { key: `flow-${field}`, name: `${label} change — OTP, step-up and Save`, description: 'Run on a test account. Verification alone does not apply a change. A changed email does not require a replacement mobile OTP; the separate step-up is an existing security check. Use a different unused contact value each run.', endpoints: [
      ep('1. Read saved profile', 'GET', 'user/profile'),
      clone(core('auth/contact/request'), `2. Send ${field} OTP`, { body: { field, value }, capture: { [`${prefix}ChallengeId`]: 'data.challengeId' } }),
      clone(core('auth/contact/verify'), `3. Verify ${field} OTP`, { body: { challengeId: `{{${prefix}ChallengeId}}`, code: '{{otp}}' }, capture: { [`${prefix}ProofId`]: 'data.proofId' } }),
      ...requestStep(`auth.${field}.change`),
      clone(core('auth/contact/commit'), '6. Save the verified change', { body: { [field]: value, [`${prefix}ProofId`]: `{{${prefix}ProofId}}` } }),
      ep('7. Read the saved profile again', 'GET', 'user/profile'),
    ] };
  };
  return [
    { key: 'flow-sign-in', name: 'Sign in and read workspace', description: 'Set loginId/password. OTP is the code delivered by the configured server. The device step is skipped if login already returned a session. Restricted or no-workspace outcomes require their dedicated recovery requests.', endpoints: [
      { name: '1. Health', method: 'GET', path: 'health', auth: 'none' },
      clone(core('auth/login'), '2. Sign in'),
      clone(core('auth/login/device'), '3. Verify device if requested', { prerequest: ['if (pm.variables.get("loginNext") !== "device_code") pm.execution.skipRequest();'] }),
      ep('4. List workspaces', 'GET', 'auth/workspaces'), ep('5. Read workspace access', 'GET', 'workspace/access'), ep('6. Read saved profile', 'GET', 'user/profile'),
    ] },
    { key: 'flow-signup', name: 'Individual signup — includes browser consent', description: 'Run one request at a time. Use a new test mobile and email. Pause after identity/start, open authorizationUrl and finish DigiLocker consent. Company/proprietorship signup is available in the API reference with its additional business fields.', endpoints: [
      clone(core('signup/mobile'), '1. Send mobile OTP'), clone(core('signup/mobile/verify'), '2. Verify mobile'),
      clone(core('signup/kind'), '3. Choose individual', { body: { token: '{{signupToken}}', kind: 'individual' } }),
      clone(core('signup/identity/start'), '4. Start consent — open authorizationUrl'), clone(core('signup/identity/verify'), '5. Verify after browser consent'), clone(core('signup/complete'), '6. Complete signup'),
      clone(core('auth/email/resend'), '7. Send first email verification'), clone(core('auth/email/verify'), '8. Verify email'),
    ] },
    contact('email'), contact('mobile'),
    { key: 'flow-activity', name: 'Activity export', description: 'Owner account with audit.export permission. Retrieve the signed URL in the export response; use Postman Send and Download for the file. This server endpoint returns JSON rather than a branded PDF.', endpoints: [ep('1. Read activity', 'GET', 'account/audit'), ...requestStep('audit.export'), clone(core('account/audit/export'), '4. Create export')] },
    { key: 'flow-payments', name: 'Payments — plan and credit order variants', description: 'Use Razorpay test mode. Choose ONE create-order variant, complete the provider checkout manually, then fill razorpayPaymentId and razorpaySignature before verification. Creating an order does not prove a successful payment. Never invent a successful signature.', endpoints: [
      ep('1. List active plans', 'GET', 'payments/plans'),
      ep('2. List credit packs', 'GET', 'payments/credit-packs'),
      ep('3a. Create a plan order', 'POST', 'payments/create-order', { body: { purpose: 'plan', planId: '{{planId}}', acknowledgeDowngrade: [] }, capture: { razorpayOrderId: 'data.order.id' } }),
      ep('3b. Create a credit top-up order', 'POST', 'payments/create-order', { body: { purpose: 'credits', credits: 250 }, capture: { razorpayOrderId: 'data.order.id' } }),
      ep('4. Verify completed checkout', 'POST', 'payments/verify-payment', { body: { razorpay_order_id: '{{razorpayOrderId}}', razorpay_payment_id: '{{razorpayPaymentId}}', razorpay_signature: '{{razorpaySignature}}' } }),
      ep('5. Read plan status after verification', 'GET', 'user/plan-status'),
      ep('6. Read credit balance', 'GET', 'user/credits'),
    ] },
    { key: 'flow-admin', name: 'Admin login and find current owner contacts', description: 'Admin credentials are separate from app credentials. Get the legacy userId from user search; do not substitute a Person or Tenant ID. Header and member owner contacts should match after an app profile save (member contacts are masked).', endpoints: [
      { name: '1. Admin login', method: 'POST', path: 'api/admin/v1/auth/login', auth: 'none', body: { email: '{{adminEmail}}', password: '{{adminPassword}}' }, capture: { adminToken: 'data.token' } },
      { name: '2. Find user by saved contact', method: 'POST', path: 'api/admin/v1/users/search', body: { filters: { query: '{{newEmail}}', deviceTypes: [], workspaces: [], subscriptionStates: [], accountStatuses: [] }, page: 1, limit: 10 }, capture: { userId: 'data.items.0._id' } },
      { name: '3. Read current owner header', method: 'GET', path: 'api/admin/v1/users/:userId' },
      { name: '4. Compare owner member row', method: 'GET', path: 'api/admin/v1/users/:userId/team' },
    ] },
  ];
}
