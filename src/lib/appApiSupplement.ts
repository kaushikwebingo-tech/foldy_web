import type { ApiSection, PmEndpoint, PmField } from './postmanCore';

// Requests added after the API console catalog was last completed. Examples are
// synthetic; OTPs, tickets, proofs and IDs must come from the preceding response.
const vars = (...keys: string[]): PmField[] => keys.map(key => ({ key, value: `{{${key}}}` }));
const stepUp = (action: string): Pick<PmEndpoint, 'headers' | 'description'> => ({
  headers: [{ key: 'X-Step-Up', value: '{{stepUpToken}}' }],
  description: `First complete /auth/step-up/start and /verify for action "${action}" in this session. Send the returned proof as X-Step-Up; proofs expire and may be single-use.`,
});
const ep = (name: string, method: PmEndpoint['method'], path: string, extra: Partial<PmEndpoint> = {}): PmEndpoint => ({ name, method, path, ...extra });
const reset = 'api/v1/auth/password/reset';

const identity: ApiSection = {
  key: 'identity-lifecycle', name: 'Identity — Contact, Recovery and Account Lifecycle',
  description: 'Saved contacts change only after proof verification and commit. Reset and sign-in recovery tickets are not app JWTs. Use a fresh step-up for the exact action being tested.',
  endpoints: [
    ep('Request replacement email OTP', 'POST', 'api/v1/auth/contact/request', {
      body: { field: 'email', value: '{{newEmail}}' },
      capture: { emailChallengeId: 'data.challengeId' },
      description: 'Stages a replacement; does not change the saved email. Store data.challengeId as emailChallengeId. For mobile use field:"mobile", value:{{newMobile}} and retain a separate challenge/proof.',
    }),
    ep('Verify replacement email OTP', 'POST', 'api/v1/auth/contact/verify', {
      body: { challengeId: '{{emailChallengeId}}', code: '{{otp}}' },
      capture: { emailProofId: 'data.proofId' },
      description: 'Store data.proofId as emailProofId. Proof is bound to the contact, person, session and saved-contact revision; verification alone does not save the profile.',
    }),
    ep('Commit verified replacement email', 'POST', 'api/v1/auth/contact/commit', {
      ...stepUp('auth.email.change'), body: { email: '{{newEmail}}', emailProofId: '{{emailProofId}}' },
      description: 'Commit the exact verified email. Replacing an already verified email requires a current step-up for auth.email.change; first verification during signup grace may not. For mobile include mobile+mobileProofId and step-up auth.mobile.change. If both contacts change, send both proof IDs in this one atomic commit. Unchanged fields need no replacement OTP.',
    }),
    ep('Start sign-in re-verification', 'POST', 'api/v1/auth/reverify/start', {
      auth: 'none', body: { token: '{{reverifyToken}}' },
      capture: { reverifyChallengeToken: 'data.challengeToken' },
      description: 'Use the re-verification token returned by login when account recovery is required. Save the returned challengeToken; this is not the normal login challenge.',
    }),
    ep('Verify sign-in re-verification', 'POST', 'api/v1/auth/reverify/verify', {
      auth: 'none', body: { challengeToken: '{{reverifyChallengeToken}}', code: '{{otp}}' },
      description: 'Completes the recovery code challenge. Use the returned scope/session state; do not treat every returned token as a normal app session.',
    }),
    ep('Start password reset', 'POST', `${reset}/start`, {
      auth: 'none', body: { loginId: '{{loginId}}' },
      capture: { resetTicket: 'data.ticket' },
      description: 'Forgot-password entry. Save data.ticket as resetTicket and follow the returned next state. Unknown accounts use a neutral response to avoid enumeration.',
    }),
    ep('Resend password reset code', 'POST', `${reset}/resend`, { auth: 'none', body: { ticket: '{{resetTicket}}' }, capture: { resetTicket: 'data.ticket' } }),
    ep('Verify password reset code', 'POST', `${reset}/verify`, {
      auth: 'none', body: { ticket: '{{resetTicket}}', code: '{{otp}}' },
      capture: { resetTicket: 'data.ticket' },
      description: 'Inspect the returned state; a verified email proof may be required after the mobile proof. Preserve the newest ticket/state supplied by the server.',
    }),
    ep('Password reset state', 'GET', `${reset}/state`, { auth: 'none', query: [{ key: 'ticket', value: '{{resetTicket}}' }] }),
    ep('Cancel password reset', 'POST', `${reset}/cancel`, { auth: 'none', body: { ticket: '{{resetTicket}}' } }),
    ep('Complete password reset', 'POST', `${reset}/complete`, {
      auth: 'none', body: { ticket: '{{resetTicket}}', password: '{{newPassword}}' },
      description: 'Only after all required proof stages. The alternative is resetToken instead of ticket; never send both. This changes the password and may end existing sessions.',
    }),
    ep('First password setup', 'POST', 'api/v1/auth/password/first-set', {
      auth: 'password-setup', body: { newPassword: '{{newPassword}}', noticeVersion: '{{noticeVersion}}' },
      description: 'Requires the set-password-only session supplied during staff onboarding. A normal app token does not substitute for this scoped session.',
    }),
    ep('Change current password', 'POST', 'api/v1/auth/password/change', {
      ...stepUp('auth.password.change'), body: { currentPassword: '{{password}}', newPassword: '{{newPassword}}' },
    }),
    ep('Security cooldown state', 'GET', 'api/v1/auth/security/cooldown', {
      description: 'Reads the caller’s cooldown state after security-sensitive changes.',
    }),
    ep('Restore a closed account', 'POST', 'api/v1/auth/account/restore', {
      auth: 'restore', body: {},
      description: 'Requires the restore-only scoped token returned at sign-in during the recovery window. Restores account access; inspect the returned session state.',
    }),
    ep('Close account', 'POST', 'api/v1/auth/account/close', {
      ...stepUp('account.close'), body: {},
      description: 'Closes the signed-in account. Run deliberately with disposable test data after a fresh account.close step-up; changes account access and starts its retention lifecycle.',
    }),
  ],
};

const workspace: ApiSection = {
  key: 'workspace-team-supplement', name: 'Workspace, Roles and Staff Contact Changes',
  description: 'Modern team routes use person sessions and tenant RBAC. Legacy /account routes are included separately for compatibility; memberships and role IDs are not interchangeable.',
  endpoints: [
    ep('Workspace alert recipients', 'GET', 'api/v1/workspace/alerts', { description: 'Owner only. Reads the workspace alert recipient configuration.' }),
    ep('Create workspace role', 'POST', 'api/v1/team/roles', {
      ...stepUp('team.roles'), body: { name: 'API Test Reader', description: 'Synthetic API test role', permissions: ['team.read', 'vault.read'] },
      description: 'Requires roles.manage and a fresh team.roles step-up. Permissions must be from GET /meta/permissions and cannot exceed the caller’s grant.',
    }),
    ep('Update workspace role', 'PATCH', 'api/v1/team/roles/:id', {
      ...stepUp('team.roles'), pathVars: [{ key: 'id', value: '{{roleId}}' }], body: { name: 'API Test Reader Updated', permissions: ['team.read', 'vault.read'] },
    }),
    ep('Delete workspace role', 'DELETE', 'api/v1/team/roles/:id', {
      ...stepUp('team.roles'), pathVars: [{ key: 'id', value: '{{roleId}}' }],
      description: 'Requires roles.manage and fresh team.roles proof. Use an unassigned custom test role; system or assigned roles may be refused.',
    }),
    ep('Propose staff contact change', 'POST', 'api/v1/team/staff/:id/contact-change', {
      ...stepUp('team.contact_change'), pathVars: [{ key: 'id', value: '{{membershipId}}' }],
      body: { field: 'email', value: '{{newEmail}}', oldContactGone: false },
      description: 'Team manager only; id is the staff membership ID. A proposal does not apply the contact. Staff must confirm and prove both contacts, or the old-contact-gone owner-approval delay applies.',
    }),
    ep('Cancel staff contact proposal', 'DELETE', 'api/v1/team/staff/:id/contact-change', { pathVars: [{ key: 'id', value: '{{membershipId}}' }] }),
    ep('Owner approve staff contact recovery', 'POST', 'api/v1/team/staff/:id/contact-change/approve', {
      ...stepUp('team.contact_change.approve'), pathVars: [{ key: 'id', value: '{{membershipId}}' }], body: {},
      description: 'Owner only. Applicable to the old-contact-gone recovery route after its checks; approved changes have a 48-hour delay rather than immediately replacing the contact.',
    }),
    ep('My pending staff contact proposal', 'GET', 'api/v1/team/contact-change', { description: 'Sign in as the affected staff person, not the proposing manager.' }),
    ep('Staff confirm proposed contact', 'POST', 'api/v1/team/contact-change/confirm', {
      body: { value: '{{newEmail}}' }, capture: { staffContactChallengeId: 'data.challengeId' }, description: 'Affected staff session. Confirm the exact proposed contact and save the returned challengeId. Proves the old contact first.',
    }),
    ep('Staff verify contact proposal proof', 'POST', 'api/v1/team/contact-change/verify', {
      body: { challengeId: '{{staffContactChallengeId}}', code: '{{otp}}' },
      capture: { staffContactChallengeId: 'data.challengeId' },
      description: 'Follow data.next and retain each returned challengeId. When next is not done, prove the newly proposed contact with the next code. Do not reuse the old challenge.',
    }),
    ep('Staff decline proposed contact', 'POST', 'api/v1/team/contact-change/decline', { body: {} }),
    ep('Stop contact change from secure link', 'GET', 'api/v1/team/contact-change/stop', {
      auth: 'none', query: [{ key: 't', value: '{{contactStopToken}}' }], description: 'Use the unguessable stop token from the security email/SMS. This cancels a pending recovery; do not use an app JWT as the link token.',
    }),
    ep('Legacy linked memberships', 'GET', 'api/v1/account/memberships', { description: 'Compatibility route. Modern clients should normally use GET /auth/workspaces.' }),
    ep('Legacy add account member', 'POST', 'api/v1/account/memberships', {
      body: { name: 'API Test Member', mobile: '{{staffMobile}}', role: '{{roleId}}', email: '{{staffEmail}}', title: 'API Tester' },
      description: 'Legacy owner-only member creation; role is a role ID. Requires verified ownership and members feature enabled. This may send an invitation/security message to the specified test contact.',
    }),
    ep('Legacy enter linked account', 'POST', 'api/v1/account/memberships/enter', {
      body: { accountId: '{{accountId}}' }, description: 'Compatibility account selector. Modern identity sessions should use POST /auth/workspace/switch with tenantId.',
    }),
    ep('Legacy leave linked account', 'POST', 'api/v1/account/memberships/:id/leave', {
      pathVars: [{ key: 'id', value: '{{membershipId}}' }], body: {}, description: 'Revokes the caller’s membership in the linked account. Use a disposable staff membership.',
    }),
  ],
};

const uploadsExports: ApiSection = {
  key: 'uploads-exports-supplement', name: 'Manual Upload Periods and Data Exports',
  endpoints: [
    ep('Stored manual upload periods', 'GET', 'api/v1/manual-uploads/:category/periods', {
      pathVars: [{ key: 'category', value: 'ptax' }], description: 'Reads stored periods independently of document-list limits. Monthly filing period is MM-YYYY; annual period is YYYY-YY.',
    }),
    ep('List manual uploads for one period', 'GET', 'api/v1/manual-uploads/:category/items', {
      pathVars: [{ key: 'category', value: 'ptax' }], query: [{ key: 'frequency', value: 'monthly' }, { key: 'period', value: '{{uploadPeriod}}' }],
      description: 'One filing document per category/frequency/period. For property papers omit both period and frequency; multiple documents remain supported there.',
    }),
    ep('Upload filing document', 'POST', 'api/v1/manual-uploads/:category/upload', {
      pathVars: [{ key: 'category', value: 'ptax' }],
      formdata: [{ key: 'file', type: 'file', description: 'Select a PDF/JPG/JPEG/PNG test document; obey category size limits.' }, { key: 'frequency', value: 'monthly' }, { key: 'period', value: '{{uploadPeriod}}' }],
      capture: { manualUploadId: 'data.id' }, statuses: [201],
      description: 'Select a local file. Monthly: period MM-YYYY (e.g.11-2026); annual: YYYY-YY (e.g.2026-27). Read category frequencies first. Occupied filing periods return409; property documents omit frequency/period. Do not set multipart Content-Type manually: Postman must supply its boundary.',
    }),
    ep('Activity export', 'POST', 'api/v1/account/audit/export', {
      ...stepUp('audit.export'), body: {},
      description: 'Owner only, with fresh audit.export step-up. Optional JSON filters: area,actor,operation,from,to. Returns signed download metadata; the API payload is a JSON audit export. The mobile app renders its branded PDF locally, so this API does not itself return the app PDF.',
    }),
    ep('Personal export state', 'GET', 'api/v1/me/data-export'),
    ep('Export my personal data', 'POST', 'api/v1/me/data-export', { ...stepUp('me.data_export'), body: {} }),
    ep('Export workspace data', 'POST', 'api/v1/workspace/export', { ...stepUp('workspace.export'), body: {}, description: 'Owner-only workspace export, with a fresh workspace.export step-up. Inspect returned signed download metadata and fetch the file before the URL expires.' }),
    ep('My vault download quota', 'GET', 'api/v1/vault/download-quota'),
    ep('Owner lift vault download cap', 'POST', 'api/v1/vault/download-quota/override', { body: {}, description: 'Owner only. Lifts the download cap for this workspace for24hours. Run deliberately on a test workspace.' }),
    ep('Storage add-ons catalog', 'GET', 'api/v1/payments/storage-addons'),
    ep('GSTR-2B request status (query)', 'GET', 'api/v1/b2b/gst/profiles/:id/gstr2b/status', { pathVars: [{ key: 'id', value: '{{gstProfileId}}' }], query: [{ key: 'int_tran_id', value: '{{intTranId}}' }] }),
    ep('GSTR-2B request status (body)', 'POST', 'api/v1/b2b/gst/profiles/:id/gstr2b/status', { pathVars: [{ key: 'id', value: '{{gstProfileId}}' }], body: { int_tran_id: '{{intTranId}}' } }),
  ],
};

const publicEndpoints: PmEndpoint[] = [
  ep('Server welcome', 'GET', '', { auth: 'none' }),
  ep('Health check', 'GET', 'health', { auth: 'none' }),
  ep('Feature availability', 'GET', 'api/v1/features', { auth: 'none', description: 'Public, no-store availability snapshot for dashboard/module kill switches.' }),
  ep('Grievance officer', 'GET', 'api/v1/meta/grievance-officer', { auth: 'app' }),
  ep('Verify company PAN details at signup', 'POST', 'api/v1/signup/company-pan/verify', {
    auth: 'none', body: { token: '{{signupToken}}', pan: '{{companyPan}}', nameAsPerPan: 'API TEST PRIVATE LIMITED', incorporationDate: '2020-04-01' },
    description: 'Uses the signup draft token in JSON, not a normal session JWT. Only for business signup with a supported company entity type.',
  }),
];
for (const path of ['callback', 'signup/digilocker/return', 'api/v1/signup/digilocker/return']) {
  publicEndpoints.push(ep('DigiLocker browser return', 'GET', path, {
    auth: 'none', query: [{ key: 'state', value: '{{digilockerState}}' }],
    description: 'Provider/browser callback. Use the genuine session state and provider-returned parameters from a test DigiLocker session. A fabricated successful callback does not verify an identity; clients finish by checking signup status/verify.',
  }));
}
for (const prefix of ['api/v1/app-versioning', 'api/v1']) {
  publicEndpoints.push(
    ep('Check installed app version', 'GET', `${prefix}/check-update/:current_version`, {
      auth: 'none', pathVars: [{ key: 'current_version', value: '{{currentVersion}}' }], query: [{ key: 'platform', value: 'android' }, { key: 'package', value: 'com.foldy.in' }],
    }),
    ep('Check app version (query alias)', 'GET', `${prefix}/check-update`, {
      auth: 'none', query: [{ key: 'current_version', value: '{{currentVersion}}' }, { key: 'platform', value: 'android' }, { key: 'package', value: 'com.foldy.in' }],
    }),
    ep('Google Play OAuth callback', 'GET', `${prefix}/google-callback`, { auth: 'none', query: [{ key: 'code', value: '{{googleAuthCode}}' }, { key: 'state', value: '{{googleAuthState}}' }], description: 'Google redirects the browser here after the admin started the flow (admin app-versioning/google-auth-url). The one-time state ties the code to that admin; a missing, reused or foreign state is refused. The Google Play admin operations moved to the admin API (audit CFG-01/PAY-02).' }),
  );
}
for (const suffix of ['check-update', 'check-update/:current_version']) {
  publicEndpoints.push(ep('Root app version alias', 'GET', suffix, {
    auth: 'none', ...(suffix.includes(':') ? { pathVars: [{ key: 'current_version', value: '{{currentVersion}}' }] } : { query: [{ key: 'current_version', value: '{{currentVersion}}' }] }),
  }));
}
publicEndpoints.push(ep('Sandbox TDS provider webhook', 'POST', 'webhook/sandbox/tds', {
  auth: 'none', headers: [{ key: 'X-Sandbox-Signature', value: '{{sandboxWebhookSignature}}' }],
  body: { data: { job_id: '{{tdsJobId}}', status: 'completed', certificate_pdf_zip_urls: [] } },
  description: 'Provider callback, not a bearer-auth client API. Sign the exact request JSON with server SANDBOX_WEBHOOK_SECRET using HMAC-SHA256, Base64 output. Use a disposable TDS job; event may update its state. A fake signature is expected to fail401.',
}));

const aa: ApiSection = {
  key: 'aa-template-supplement', name: 'Account Aggregator — All Templates and Mounts',
  description: 'Shared handlers are mounted for banking, equity, mutual funds/SIP and insurance at both /moneyone and /investment. /investment requires a business workspace. Create consent, approve at the provider, resolve it, sync, then read accounts and transactions. Provider consent cannot be simulated by a successful HTTP status alone.',
  endpoints: [],
};
for (const prefix of ['api/v1/moneyone', 'api/v1/investment']) {
  aa.endpoints.push(ep('Account aggregator templates', 'GET', `${prefix}/templates`));
  for (const template of ['banking', 'equity', 'mf-sip', 'insurance_policies']) {
    const base = `${prefix}/${template}`;
    const label = `${prefix.includes('/investment') ? 'Business' : 'Shared'} ${template}`;
    aa.endpoints.push(
      ep(`${label} — Create consent`, 'POST', `${base}/consent`, { body: { pan: '{{pan}}' }, capture: { consentHandle: 'data.consentHandle', aaCallbackToken: 'data.token' }, description: 'Requires an active plan and verified workspace. Use the test account’s actual PAN; optional fipID may be supplied. Open webRedirectionUrl and approve with the provider before resolving.' }),
      ep(`${label} — Resolve consent`, 'GET', `${base}/consent/resolve`, { query: [{ key: 'handle', value: '{{consentHandle}}' }], capture: { consentId: 'data.consentID' } }),
      ep(`${label} — Consent status`, 'GET', `${base}/consent/status`),
      ep(`${label} — Revoke consent`, 'POST', `${base}/consent/revoke`, { body: { consentId: '{{consentId}}' }, description: 'Revokes the selected provider consent. This is a state-changing operation; use a test consent.' }),
      ep(`${label} — Stored accounts`, 'GET', `${base}/accounts`, { capture: { linkRef: 'data.accounts.0.linkRefNumber' } }),
      ep(`${label} — Stored account detail`, 'GET', `${base}/accounts/:linkRef`, { pathVars: vars('linkRef') }),
      ep(`${label} — Transactions`, 'GET', `${base}/accounts/:linkRef/transactions`, { pathVars: vars('linkRef'), query: [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }], description: 'Stored normalized data. Optional filters from,to,direction,minAmount,maxAmount,search are AND-combined; empty filters should be omitted.' }),
      ep(`${label} — Transaction CSV`, 'GET', `${base}/accounts/:linkRef/transactions/export`, { pathVars: vars('linkRef'), description: 'Streams CSV. Optional transaction filters; metered investment download. Use Postman Save Response to File to retain the CSV.' }),
      ep(`${label} — Email transaction CSV`, 'POST', `${base}/accounts/:linkRef/transactions/email`, { pathVars: vars('linkRef'), body: {}, description: 'Sends the filtered CSV only to the signed-in user’s saved email. This performs actual delivery when configured; use a controlled test account. Metered download.' }),
      ep(`${label} — Sync consent data`, 'POST', `${base}/sync`, { body: { consentId: '{{consentId}}' }, description: 'Fetches and ingests provider data; metered refresh. Wait until provider consent is active before calling.' }),
      ep(`${label} — All consent data`, 'GET', `${base}/data/:consentId/all`, { pathVars: vars('consentId'), description: 'Live metered provider data. Requires a granted consent and access to this workspace.' }),
      ep(`${label} — Account consent data`, 'GET', `${base}/data/:consentId/account/:linkRef`, { pathVars: vars('consentId', 'linkRef'), query: [{ key: 'limit', value: '100' }, { key: 'offset', value: '0' }] }),
      ep(`${label} — Account balance`, 'GET', `${base}/data/:consentId/account/:linkRef/balance`, { pathVars: vars('consentId', 'linkRef') }),
    );
  }
}

const corrections: ApiSection = {
  key: 'request-quality-corrections', name: 'Verified Request Examples — Staff, Vault, GST and Tax',
  description: 'Overrides stale examples using the current server validators and response shapes. Select actual test files, portal credentials and provider OTPs; API response URLs and IDs are captured from your own test account.',
  endpoints: [
    ep('Add staff and retain membership ID', 'POST', 'api/v1/team/staff', {
      body: { name: 'API Test Member', mobile: '{{staffMobile}}', email: '{{staffEmail}}', role: '{{roleId}}', title: 'API Tester' },
      capture: { membershipId: 'data.membershipId' }, statuses: [201],
      description: 'Requires team.manage, verified ownership, an available seat and a role ID from GET /team/roles. role is the24-character role ID, not its label. Sends a setup email to the specified test contact.',
    }),
    ep('Change staff role', 'PATCH', 'api/v1/team/staff/:id/role', {
      ...stepUp('team.staff.role'), pathVars: [{ key: 'id', value: '{{membershipId}}' }],
      body: { role: '{{roleId}}', acknowledgeAlertShrink: false },
      description: 'Requires team.manage and team.staff.role step-up. If409 asks to acknowledge removing the last alert recipient, review the affected module then retry with acknowledgeAlertShrink:true.',
    }),
    ep('Suspend staff', 'POST', 'api/v1/team/staff/:id/suspend', {
      ...stepUp('team.staff'), pathVars: [{ key: 'id', value: '{{membershipId}}' }], body: { reason: 'API test suspension', acknowledgeAlertShrink: false },
    }),
    ep('Reactivate staff', 'POST', 'api/v1/team/staff/:id/reactivate', {
      ...stepUp('team.staff'), pathVars: [{ key: 'id', value: '{{membershipId}}' }], body: {},
    }),
    ep('Remove staff', 'DELETE', 'api/v1/team/staff/:id', {
      ...stepUp('team.staff'), pathVars: [{ key: 'id', value: '{{membershipId}}' }], body: { acknowledgeAlertShrink: false },
    }),
    ep('Resend staff setup email', 'POST', 'api/v1/team/staff/:id/setup/resend', {
      ...stepUp('team.staff'), pathVars: [{ key: 'id', value: '{{membershipId}}' }], body: {},
      description: 'Requires team.manage and fresh team.staff step-up. Actually sends a set-password email to the staff member’s registered address; use a controlled test address.',
    }),
    ep('Retired legacy contact request — expected409', 'POST', 'api/v1/user/profile/contact/request-otp', {
      body: { email: '{{newEmail}}' }, statuses: [409],
      description: 'Compatibility refusal: the controller always returns409 with next:verify_contact and does not send an OTP. Use /auth/contact/request, /verify and /commit instead.',
    }),
    ep('Retired legacy contact verification — expected409', 'POST', 'api/v1/user/profile/contact/verify', {
      body: { emailOtp: '{{otp}}' }, statuses: [409],
      description: 'Compatibility refusal: the controller always returns409 without applying a contact change. Modern profile changes use /auth/contact/commit.',
    }),
    ep('Delete legacy account with explicit confirmation', 'DELETE', 'api/v1/user/account', {
      body: { confirmation: 'delete my account' },
      description: 'Destructive legacy account deletion. Requires this exact confirmation phrase; use only a disposable test account. Modern identity account lifecycle is /auth/account/close with a fresh step-up.',
    }),
    ep('Create vault test folder', 'POST', 'api/v1/vault/folders', {
      body: { name: 'API Test Documents', parentId: null }, capture: { folderId: 'data.id' }, statuses: [201],
    }),
    ep('Upload vault document', 'POST', 'api/v1/vault/files', {
      formdata: [{ key: 'file', type: 'file', description: 'Select one permitted local test document.' }, { key: 'folderId', value: '{{folderId}}' }],
      capture: { fileId: 'data.id' }, statuses: [202],
      description: 'Multipart file upload, not JSON. Omit folderId to upload at root. Capture the returned ID and poll GET /vault/files/:id until processing is ready before requesting its download link. Postman supplies the multipart boundary.',
    }),
    ep('Bulk trash one selected vault file', 'POST', 'api/v1/vault/bulk', {
      body: { action: 'trash', fileIds: ['{{fileId}}'], folderIds: [] },
      description: 'Select1–200 actual file/folder IDs. Both arrays empty is always a validation error. This example trashes the uploaded test file; to move, set action:move and destinationId to a folder ID or null for root.',
    }),
    ep('Download vault file link', 'GET', 'api/v1/vault/files/:id/download', {
      pathVars: [{ key: 'id', value: '{{fileId}}' }], capture: { fileDownloadUrl: 'data.url' },
      description: 'Requires a ready file and available download quota. Returns signed download metadata rather than directly streaming the file. Download before its URL expires.',
    }),
    ep('Create GST profile and capture ID', 'POST', 'api/v1/b2b/gst/profiles', {
      body: { gstin: '{{gstin}}', gstUsername: '{{gstUsername}}' }, capture: { gstProfileId: 'data.profile._id' }, statuses: [201],
      description: 'Requires an active eligible plan. Uses the actual GSTIN/portal username for your test workspace and sends a provider OTP to the contact registered on the GST portal. Provider OTPs are independent from Foldy’s app OTP utility.',
    }),
    ep('List GST profiles and capture first ID', 'GET', 'api/v1/b2b/gst/profiles', { capture: { gstProfileId: 'data.0._id' } }),
    ep('Verify GST provider OTP', 'POST', 'api/v1/b2b/gst/profiles/:id/authorize/verify', {
      pathVars: [{ key: 'id', value: '{{gstProfileId}}' }], body: { otp: '{{providerOtp}}' },
      description: 'Use the6-digit OTP sent by the GST provider for this profile, not the default code used for Foldy-owned challenges. Authorizes the stored GST session.',
    }),
    ep('Order ROC/LLP documents and capture job', 'POST', 'api/v1/b2b/roc/job', {
      body: { identifier: '{{cin}}', name: '{{companyName}}' }, capture: { rocJobId: 'data.jobId' }, statuses: [202],
      description: 'Requires the test workspace’s exact company name and valid CIN (or replace identifier with an LLPIN such asAAP-7675). May call the provider and consume credits. Poll GET /b2b/roc/job until ready before listing documents.',
    }),
    ep('Documents from selected ROC job', 'GET', 'api/v1/b2b/roc/documents', {
      query: [{ key: 'jobId', value: '{{rocJobId}}' }, { key: 'page', value: '1' }, { key: 'limit', value: '20' }],
    }),
    ep('Connect TDS profile and capture ID', 'POST', 'api/v1/b2b/tds/profiles', {
      body: { tan: '{{tan}}', tracesUsername: '{{tracesUsername}}', tracesPassword: '{{tracesPassword}}', label: 'API Test Office' },
      capture: { tdsProfileId: 'data.id' }, statuses: [201],
    }),
    ep('Submit TDS certificate job', 'POST', 'api/v1/b2b/tds/certificates/:form', {
      pathVars: [{ key: 'form', value: '130' }], body: { quarter: 'Q1', tax_year: '{{taxYear}}', profileId: '{{tdsProfileId}}' },
      capture: { tdsJobId: 'data.jobId' }, statuses: [202],
      description: 'Use130 for salary TDS or131 for other TDS. tax_year format is TY YYYY-YY. profileId is the connected TDS account ID; omit it to use the default profile. Capture the provider job ID before polling.',
    }),
    ep('Link income-tax portal', 'POST', 'api/v1/income-tax/itr-client', {
      body: { username: '{{pan}}', password: '{{portalPassword}}' },
      description: 'Use the real e-filing portal credentials of the controlled test account. The server validates PAN ownership; the portal password is not the Foldy password.',
    }),
    ep('Fetch ITR year list and retain first statement', 'POST', 'api/v1/income-tax/itr/download', {
      body: {}, capture: { itrId: 'data.items.0.itrId', itrJsonUrl: 'data.items.0.downloadLink' },
      description: 'Successful empty items[] is valid. Capture the selected statement’s itrId and downloadLink before reading or rendering. A refresh may call the provider and use credits.',
    }),
    ep('Fetch26AS year list and retain first statement', 'POST', 'api/v1/income-tax/26as/download', {
      body: {}, capture: { tdsId: 'data.items.0.tdsId', statementJsonUrl: 'data.items.0.downloadLink' },
      description: 'Successful empty items[] is valid. Select a returned tdsId and its downloadLink; do not invent IDs or reuse a statement from another account.',
    }),
    ep('Render26AS statement PDF', 'POST', 'api/v1/income-tax/:itType', {
      pathVars: [{ key: 'itType', value: '26as' }], body: { jsonUrl: '{{statementJsonUrl}}' },
      description: 'The required key is jsonUrl, not downloadLink. Supply the HTTPS downloadLink of your own fetched26AS statement as jsonUrl. The server verifies ownership, renders PDF bytes and meters download credits. For ITR change itType to itr-x and use itrJsonUrl. jsonUrl is the only field: every printed value comes from the provider record, and any override (pan, name, income…) is refused with 400 (audit INT-03).',
    }),
    ep('Verify actual checkout payment', 'POST', 'api/v1/payments/verify-payment', {
      body: { razorpay_order_id: '{{razorpayOrderId}}', razorpay_payment_id: '{{razorpayPaymentId}}', razorpay_signature: '{{razorpaySignature}}' },
      description: 'Use the exact three values from a completed Razorpay test checkout for the order created by this account. A mock payment ID or hardcoded signature does not verify a real payment. The operation applies purchased entitlements and is idempotent for an already applied payment.',
    }),
  ],
};

export const APP_API_SUPPLEMENT: ApiSection[] = [
  identity, workspace, uploadsExports,
  { key: 'public-system-supplement', name: 'System Metadata, App Versioning and Provider Callbacks', endpoints: publicEndpoints },
  aa, corrections,
];
