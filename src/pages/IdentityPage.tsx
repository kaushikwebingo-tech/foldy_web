import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { identityApi } from '@/api/identityApi';
import { setToken } from '@/lib/utils';
import { KeyRound } from 'lucide-react';

/*
 * The NEW identity model — RBAC_MASTER_PLAN.md §3 (signup), §5.1-§5.2 (sign-in),
 * §5.4 (the switcher), §5.7 (the email gate) and §3.1's PAN on a live session.
 *
 * WHY THIS PAGE EXISTS. The server has landed `signupRoutes` and
 * `identityAuthRoutes`, both mounted ahead of the legacy PAN-first `authRoutes`, and
 * the Flutter app has been built against them — but nothing could drive them by hand.
 * Eleven signup routes, nine sign-in/gate routes and `POST /tenant/pan` were reachable
 * and undriveable, which is the worst state for an endpoint to be in during a rebuild.
 *
 * IT MUST NOT CRASH. Every response is read with `?.` and nothing assumes an envelope
 * shape: a route that answers 404 because its phase has not landed shows the error in
 * the card's own viewer, like any other response, and the page keeps working. The
 * draft token and the session token are lifted out of a reply only when they are
 * actually there.
 *
 * The old PAN-first login still lives on the Login page. Both are correct today; §12
 * retires the PAN one, and until then the console shows which is which rather than
 * quietly preferring one.
 */

const KINDS = [
  { label: 'Business (§3.1 — 5 screens)', value: 'business' },
  { label: 'Individual (§3.2 — 5 screens)', value: 'individual' },
];

const REMEMBER = [
  { label: 'yes — remember this device for 30 days', value: 'yes' },
  { label: 'no', value: 'no' },
];

/** Pulls a token-ish field out of any envelope shape, without assuming one. */
function pick(res: unknown, ...keys: string[]): string | undefined {
  const body = (res as { data?: { data?: Record<string, unknown> } })?.data?.data;
  if (!body || typeof body !== 'object') return undefined;
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'string' && v) return v;
  }
  return undefined;
}

export default function IdentityPage() {
  // signup
  const [mobile, setMobile] = useState('');
  const [draftToken, setDraftToken] = useState('');
  const [code, setCode] = useState('');
  const [kind, setKind] = useState('business');
  const [companyPan, setCompanyPan] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stopToken, setStopToken] = useState('');

  // sign-in
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [deviceSecret, setDeviceSecret] = useState('');
  const [ticket, setTicket] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [remember, setRemember] = useState('yes');

  // session
  const [tenantId, setTenantId] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [tenantPan, setTenantPan] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Identity — Signup & Sign-in (new model)"
        subtitle="§3 signup, §5.1 one box + a password, §5.2 the new-device code, §5.4 the workspace switcher, §5.7 the email gate. Mounted ahead of the legacy PAN-first login, which still works on the Login page."
        icon={<KeyRound size={18} />}
        badge="Public + Session"
        postmanSection="identity"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>No session exists during signup</strong>, so the draft token plus a code answered on this attempt is what
        stands in for one. Re-opening a draft clears the proof and costs a fresh code — the resume link skips the typing,
        never the proof. The draft token is lifted out of each reply automatically where the server returns one; paste it
        by hand otherwise.
        <span className="block mt-1">
          One limiter covers the whole public family: 300 per 15 minutes per IP, because one sign-in is two to four calls
          behind carrier-grade NAT. It fails <em>open</em>; the per-identifier caps that decide whether an SMS is paid for
          fail <em>closed</em>.
        </span>
      </div>

      <div className="space-y-4">
        {/* ── signup ─────────────────────────────────────────────── */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">Signup · public (§3.1 / §3.2)</p>

        <ApiCard
          step={1}
          title="Screen 1 — Mobile"
          method="POST"
          endpoint="/api/v1/signup/mobile"
          description="Ten digits behind a fixed +91, under the itemised consent notice (§10.1). Starts a pending_signups draft and sends the first code. The reply names no existing account — identical copy, status and latency whether the number is known or not (§8.2)."
          buttonLabel="Send Code"
          onSubmit={async () => {
            const res = await identityApi.signupMobile(mobile.trim());
            const t = pick(res, 'draftToken', 'token');
            if (t) setDraftToken(t);
            return res;
          }}
        >
          <Field label="Mobile (10 digits)" value={mobile} onChange={setMobile} placeholder="9876543210" fullWidth />
        </ApiCard>

        <ApiCard
          step={2}
          title="Screen 2 — The Code"
          method="POST"
          endpoint="/api/v1/signup/mobile/verify"
          description="The first and ONLY place an existing account is named — after a correct code, never before it (§8.2). Resend is the card below."
          buttonLabel="Verify"
          onSubmit={async () => {
            const res = await identityApi.signupVerifyMobile(draftToken.trim(), code.trim());
            const t = pick(res, 'draftToken', 'token');
            if (t) setDraftToken(t);
            return res;
          }}
        >
          <Field label="Draft token" value={draftToken} onChange={setDraftToken} placeholder="auto-filled from screen 1" fullWidth />
          <Field label="Code" value={code} onChange={setCode} placeholder="6 digits" />
        </ApiCard>

        <ApiCard
          title="Resend the signup code"
          method="POST"
          endpoint="/api/v1/signup/mobile/resend"
          description="Same draft, a fresh code. Counted against the per-identifier cap in Mongo, not the per-IP limiter."
          buttonLabel="Resend"
          onSubmit={() => identityApi.signupResendCode(draftToken.trim())}
        />

        <ApiCard
          step={3}
          title="Screen 3 — Business or Individual"
          method="POST"
          endpoint="/api/v1/signup/kind"
          description="One tap. This is the fork: business goes to the company PAN, individual to DigiLocker (decision R17)."
          buttonLabel="Choose"
          onSubmit={() => identityApi.signupKind(draftToken.trim(), kind as 'business' | 'individual')}
        >
          <SelectField label="Kind" value={kind} onChange={setKind} options={KINDS} fullWidth />
        </ApiCard>

        <ApiCard
          step={4}
          title="Screen 4 (business) — Company PAN"
          method="POST"
          endpoint="/api/v1/signup/company-pan"
          description="The PAN goes out to KYC and the name, type and incorporation date come back to be confirmed. §3.4 then discovers the GSTINs from it — one tax identity in, the rest found."
          buttonLabel="Look Up"
          onSubmit={() => identityApi.signupCompanyPan(draftToken.trim(), companyPan.trim())}
        >
          <Field label="Company PAN" value={companyPan} onChange={setCompanyPan} placeholder="ABCDE1234F" fullWidth />
        </ApiCard>

        <ApiCard
          title="Screen 4 (business) — Confirm what came back"
          method="POST"
          endpoint="/api/v1/signup/company-pan/confirm"
          description="Confirms the fetched name, type and date. Nothing is typed twice."
          buttonLabel="Confirm"
          onSubmit={() => identityApi.signupConfirmCompanyPan(draftToken.trim())}
        />

        <ApiCard
          title="Screen 4 (individual) — Start DigiLocker"
          method="POST"
          endpoint="/api/v1/signup/identity/start"
          description="The direction reverses from the old flow: DigiLocker is the SOURCE of the name and date of birth, not a test against a typed PAN (decision R17)."
          buttonLabel="Start"
          onSubmit={() => identityApi.signupIdentityStart(draftToken.trim())}
        />

        <ApiCard
          title="Screen 4 (individual) — Verify DigiLocker"
          method="POST"
          endpoint="/api/v1/signup/identity/verify"
          description="Completes the DigiLocker leg. The name it returns is pre-filled and not editable on screen 5."
          buttonLabel="Verify"
          onSubmit={() => identityApi.signupIdentityVerify(draftToken.trim())}
        />

        <ApiCard
          step={5}
          title="Screen 5 — Identity, and the one write"
          method="POST"
          endpoint="/api/v1/signup/complete"
          description="The first write to the real tables: the person, the tenant and the owner membership. ONE password box — there is no confirm-password field anywhere in the product (decision L9). §4.5's username is MINTED here and shown on a dashboard card; it is never typed."
          buttonLabel="Create Account"
          onSubmit={async () => {
            const res = await identityApi.signupComplete(draftToken.trim(), {
              ...(fullName.trim() ? { name: fullName.trim() } : {}),
              ...(email.trim() ? { email: email.trim() } : {}),
              ...(password ? { password } : {}),
            });
            const t = pick(res, 'token');
            if (t) setToken(t);
            return res;
          }}
        >
          <Field label="Full name" value={fullName} onChange={setFullName} placeholder="pre-filled on the individual branch" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Password" value={password} onChange={setPassword} placeholder="one box, no confirm field" type="password" />
        </ApiCard>

        <ApiCard
          title="§3.3 — Resume a stopped signup"
          method="POST"
          endpoint="/api/v1/signup/resume"
          description="The nudge's deep link, or the same number typed again. Reopening the draft clears the proof, so it always costs a fresh code."
          buttonLabel="Resume"
          onSubmit={async () => {
            const res = await identityApi.signupResume(mobile.trim());
            const t = pick(res, 'draftToken', 'token');
            if (t) setDraftToken(t);
            return res;
          }}
        />

        <ApiCard
          title="§3.3 — Stop the nudges"
          method="GET"
          endpoint="/api/v1/signup/stop"
          description="A GET because it is one tap in an SMS, and public for the same reason: whoever taps it has no account and no session."
          buttonLabel="Stop"
          onSubmit={() => identityApi.signupStopNudges(stopToken.trim())}
        >
          <Field label="Token from the SMS" value={stopToken} onChange={setStopToken} placeholder="opt-out token" fullWidth />
        </ApiCard>

        {/* ── sign in ────────────────────────────────────────────── */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Sign in · public (§5.1 / §5.2)</p>

        <ApiCard
          step={1}
          title="One box, and a password"
          method="POST"
          endpoint="/api/v1/auth/login"
          description="The identifier is a mobile, a verified email or the §4.5 username — the client disambiguates silently (10 digits → mobile, contains @ → email, otherwise → username, lowercased) and the box never hints whether an identifier exists. A known handset answers with a session; an unknown one, or one unseen for 30 days, answers a ticket and sends a code (§5.2) — that is not an error."
          buttonLabel="Sign In"
          onSubmit={async () => {
            const res = await identityApi.login(identifier.trim(), loginPassword, deviceSecret.trim() || undefined);
            const t = pick(res, 'token');
            if (t) setToken(t);
            const tk = pick(res, 'ticket', 'challengeId');
            if (tk) setTicket(tk);
            return res;
          }}
        >
          <Field label="Mobile, email or username" value={identifier} onChange={setIdentifier} placeholder="9876543210 / you@example.com / asha-nair-4821" />
          <Field label="Password" value={loginPassword} onChange={setLoginPassword} placeholder="••••••••" type="password" />
          <Field label="Device secret (optional)" value={deviceSecret} onChange={setDeviceSecret} placeholder="the stored secret, never a claimed device id" fullWidth />
        </ApiCard>

        <ApiCard
          step={2}
          title="New device — the code"
          method="POST"
          endpoint="/api/v1/auth/login/device"
          description="§5.2. 'Remember this device for 30 days' is the tick box behind `remember`; the secret is STORED by the app and sent on the next login, never an identifier the handset claims about itself."
          buttonLabel="Verify Device"
          onSubmit={async () => {
            const res = await identityApi.loginVerifyDevice(ticket.trim(), deviceCode.trim(), remember === 'yes');
            const t = pick(res, 'token');
            if (t) setToken(t);
            return res;
          }}
        >
          <Field label="Ticket" value={ticket} onChange={setTicket} placeholder="auto-filled from sign-in" />
          <Field label="Code" value={deviceCode} onChange={setDeviceCode} placeholder="6 digits" />
          <SelectField label="Remember this device" value={remember} onChange={setRemember} options={REMEMBER} fullWidth />
        </ApiCard>

        <ApiCard
          title="Resend the device code"
          method="POST"
          endpoint="/api/v1/auth/login/device/resend"
          onSubmit={() => identityApi.loginResendDevice(ticket.trim())}
          buttonLabel="Resend"
        />

        {/* ── session ────────────────────────────────────────────── */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Session · the switcher and the gate</p>

        <ApiCard
          title="My Workspaces (§5.4)"
          method="GET"
          endpoint="/api/v1/auth/workspaces"
          description="Every workspace this person can open. One whose plan has lapsed is LISTED, badged 'Payment due', and opens read-only — the call never refuses it (decision R6). A person with none gets a 200 and the NoWorkspaceScreen, never a 401 and never a sign-out."
          onSubmit={() => identityApi.workspaces()}
        />

        <ApiCard
          title="Switch Workspace (§5.4)"
          method="POST"
          endpoint="/api/v1/auth/workspace/switch"
          description="Swaps the session token IN THE SAME RESPONSE, so the app is never tokenless. This is not the retired account switcher: it is ONE identity moving between its own workspaces, which is why §11.2 could delete /user/account-links outright."
          buttonLabel="Switch"
          onSubmit={async () => {
            const res = await identityApi.switchWorkspace(tenantId.trim());
            const t = pick(res, 'token');
            if (t) setToken(t);
            return res;
          }}
        >
          <Field label="Tenant ID" value={tenantId} onChange={setTenantId} placeholder="workspaces[].id" fullWidth />
        </ApiCard>

        <ApiCard
          title="Email Gate — Status (§5.7)"
          method="GET"
          endpoint="/api/v1/auth/email/status"
          description="What the uncloseable gate draws itself from. These four stay reachable for a person the gate is blocking — which is why the gate lives in the app and is not a refusal in front of them: a gated person whose verify endpoint is gated can never leave."
          onSubmit={() => identityApi.emailStatus()}
        />

        <ApiCard
          title="Email Gate — Verify"
          method="POST"
          endpoint="/api/v1/auth/email/verify"
          buttonLabel="Verify Email"
          onSubmit={() => identityApi.emailVerify(emailCode.trim())}
        >
          <Field label="Code from the email" value={emailCode} onChange={setEmailCode} placeholder="6 digits" fullWidth />
        </ApiCard>

        <ApiCard
          title="Email Gate — Resend"
          method="POST"
          endpoint="/api/v1/auth/email/resend"
          buttonLabel="Resend"
          onSubmit={() => identityApi.emailResend()}
        />

        <ApiCard
          title="Email Gate — Change the address"
          method="POST"
          endpoint="/api/v1/auth/email/change"
          description="The escape hatch that stops the gate being a lockout (§5.7)."
          buttonLabel="Change"
          onSubmit={() => identityApi.emailChange(newEmail.trim())}
        >
          <Field label="New email" value={newEmail} onChange={setNewEmail} placeholder="you@example.com" fullWidth />
        </ApiCard>

        <ApiCard
          title="Attach the workspace PAN (§3.1)"
          method="POST"
          endpoint="/api/v1/tenant/pan"
          description="The fix for the app's PAN re-verify regression: the old screen finished by minting a SECOND session, which a signed-in person must never do. The tenant comes only from the session row — X-Tenant-Id does not exist as an input anywhere (§8.7 rule 2)."
          buttonLabel="Attach"
          onSubmit={() => identityApi.attachTenantPan(tenantPan.trim())}
        >
          <Field label="PAN" value={tenantPan} onChange={setTenantPan} placeholder="ABCDE1234F" fullWidth />
        </ApiCard>
      </div>
    </div>
  );
}
