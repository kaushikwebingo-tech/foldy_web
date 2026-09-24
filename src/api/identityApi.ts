import { client } from './client';

/*
 * The NEW identity model — signup, sign-in, the workspace switcher and the email
 * gate. RBAC_MASTER_PLAN.md §3.1-§3.3 (signup), §5.1-§5.2 (sign-in), §5.4 (the
 * switcher), §5.7 (the gate) and §3.1's PAN on a live session.
 *
 * THESE ROUTES EXIST ON THE SERVER TODAY: `routes/app/v1/signupRoutes.ts` and
 * `routes/app/v1/identityAuthRoutes.ts` (plus its `tenantRouter`), both mounted in
 * `routes/app/v1/index.ts` AHEAD of the legacy `authRoutes`. The two paths run side
 * by side until the PAN-first one is retired, and nothing is declared in both.
 *
 * WHAT IS NOT HERE. §6.4's served permission catalog (`GET /v1/meta/permissions`),
 * §7.12's access envelope (`GET /v1/workspace/access`) and §8.5's step-up
 * (`POST /v1/auth/step-up/start` + `/step-up/verify`) are BUILT (metaRoutes,
 * workspaceRoutes, identityAuthRoutes) and are driven from the Team page. Password
 * reset lives at `/v1/auth/password/reset/*`. There is no invite claim anywhere (R21).
 *
 * NO SESSION EXISTS during signup or during the public half of sign-in, so what
 * stands in for one is the draft token plus a code answered on THIS attempt. The
 * three public sign-in routes and the whole signup family sit behind one 300-per-15-
 * minute per-IP limiter (§8.4) because one sign-in is two to four calls behind
 * carrier-grade NAT; it fails OPEN, while the caps that decide whether an SMS is paid
 * for fail CLOSED in Mongo.
 *
 * EVERY FIELD IS OPTIONAL UNTIL PROVEN PRESENT. The console reads a draft token or a
 * session token out of a response with `?.` and never assumes an envelope shape, so a
 * half-built endpoint renders an empty result instead of throwing.
 */

/** What `data` may carry back. Every field optional on purpose (§8.9 shapes vary). */
export interface IdentityEnvelope {
  draftToken?: string;
  token?: string;
  next?: string;
  person?: Record<string, unknown>;
  tenant?: Record<string, unknown>;
  workspaces?: unknown[];
  [key: string]: unknown;
}

export const identityApi = {
  /* ── §3.1 / §3.2 — signup, five screens, PUBLIC ─────────────────────── */

  // Screen 1: ten digits behind a fixed +91, under the itemised consent notice
  // (§10.1). Starts a `pending_signups` draft and sends the first code. The reply
  // names no existing account — §8.2's enumeration rule — so identical copy, status
  // and latency whether the number is known or not.
  signupMobile: (mobile: string) =>
    client.post('/signup/mobile', { mobile }),

  // Same draft, a fresh code. Counted against the per-identifier cap, not the IP one.
  signupResendCode: (draftToken: string) =>
    client.post('/signup/mobile/resend', { draftToken }),

  // Screen 2: the code. THE FIRST AND ONLY PLACE an existing account is named —
  // after a correct code, never before it (§8.2).
  signupVerifyMobile: (draftToken: string, code: string) =>
    client.post('/signup/mobile/verify', { draftToken, code }),

  // Screen 3: one tap. `kind` is the business/individual fork of §3.1 vs §3.2.
  signupKind: (draftToken: string, kind: 'business' | 'individual') =>
    client.post('/signup/kind', { draftToken, kind }),

  // Screen 4, business: the company PAN goes out to KYC and the name, type and
  // incorporation date come back to be confirmed (§3.4 then discovers the GSTINs).
  signupCompanyPan: (draftToken: string, pan: string) =>
    client.post('/signup/company-pan', { draftToken, pan }),

  signupConfirmCompanyPan: (draftToken: string) =>
    client.post('/signup/company-pan/confirm', { draftToken }),

  // Screen 4, individual: DigiLocker is the SOURCE of the name and date of birth,
  // not a test against a typed PAN (decision R17).
  signupIdentityStart: (draftToken: string) =>
    client.post('/signup/identity/start', { draftToken }),

  signupIdentityVerify: (draftToken: string, payload: Record<string, unknown> = {}) =>
    client.post('/signup/identity/verify', { draftToken, ...payload }),

  // Screen 5: the one write to the real tables — the person, the tenant, the owner
  // membership. ONE password box, no confirm field anywhere in the product (L9).
  signupComplete: (
    draftToken: string,
    payload: { name?: string; email?: string; password?: string } = {},
  ) => client.post('/signup/complete', { draftToken, ...payload }),

  // §3.3: the nudge's deep link, or the same number typed again. Resuming skips the
  // typing, never the proof — re-opening a draft clears it and costs a fresh code.
  signupResume: (mobile: string) =>
    client.post('/signup/resume', { mobile }),

  // §3.3's opt-out. A GET because it is one tap in an SMS, and public for the same
  // reason: the person who taps it has no account and no session.
  signupStopNudges: (token: string) =>
    client.get('/signup/stop', { params: { token } }),

  /* ── §5.1 / §5.2 — sign in, PUBLIC ──────────────────────────────────── */

  // ONE BOX and a password. `identifier` is a mobile, a verified email or the
  // username §4.5 mints; the app disambiguates client-side and silently (10 digits
  // → mobile, contains @ → email, otherwise → username, lowercased) and the box
  // never hints whether an identifier exists.
  // A known handset answers with a session; an unknown one (or one unseen for 30
  // days) answers `next` and sends a code — §5.2, not an error.
  login: (identifier: string, password: string, deviceSecret?: string) =>
    client.post('/auth/login', {
      identifier,
      password,
      ...(deviceSecret ? { deviceSecret } : {}),
    }),

  // §5.2's code, plus "Remember this device for 30 days". The device secret is a
  // stored secret the app sends, NEVER an identifier a handset claims about itself.
  loginVerifyDevice: (ticket: string, code: string, remember = true) =>
    client.post('/auth/login/device', { ticket, code, remember }),

  loginResendDevice: (ticket: string) =>
    client.post('/auth/login/device/resend', { ticket }),

  /* ── §5.4 — one person, several workspaces (session) ─────────────────── */

  // Every workspace this person can open. A lapsed one is LISTED, badged
  // "Payment due", and opens read-only (decision R6) — the call never refuses it,
  // and a person with none gets a 200 and §5.4's NoWorkspaceScreen, never a 401.
  workspaces: () =>
    client.get('/auth/workspaces'),

  // Swaps the session token IN THE SAME RESPONSE, so the app is never tokenless
  // (§14.3). This is not the retired account switcher: it is one identity moving
  // between its own workspaces.
  switchWorkspace: (tenantId: string) =>
    client.post('/auth/workspace/switch', { tenantId }),

  /* ── §5.7 — the email gate (session) ────────────────────────────────── */

  // The gate's own status. These four must stay reachable for a person the gate is
  // blocking, which is why the gate lives in the app and is not a refusal in front
  // of them: a gated person whose verify endpoint is gated can never leave.
  emailStatus: () =>
    client.get('/auth/email/status'),

  emailResend: () =>
    client.post('/auth/email/resend'),

  emailVerify: (code: string) =>
    client.post('/auth/email/verify', { code }),

  // The escape hatch that stops the gate being a lockout (§5.7).
  emailChange: (email: string) =>
    client.post('/auth/email/change', { email }),

  /* ── §3.1 — the workspace's own PAN, inside a live session ──────────── */

  // The fix for the app's PAN re-verify regression: the old screen finished by
  // minting a second session, which a signed-in person must never do. The tenant
  // comes ONLY from the session row — `X-Tenant-Id` does not exist as an input
  // anywhere (§8.7 rule 2).
  attachTenantPan: (pan: string) =>
    client.post('/tenant/pan', { pan }),
};
