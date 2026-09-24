import type { ApiSection } from './postman';

/*
 * Declarative endpoint catalog used to generate Postman collections.
 * Keep paths in sync with the backend routes. Bearer auth + {{baseUrl}} are
 * applied at the collection level by the generator.
 */

const GSTIN = '29ABCDE1234F1Z5';

export const API_SECTIONS: Record<string, ApiSection> = {
  auth: {
    key: 'auth',
    name: 'Auth & Session',
    description: 'Session helpers: push-token registration and the authenticated user\'s plan/storage status (logout is in the Identity section). Login & registration are PAN-first (see Onboarding). Set {{token}} to a logged-in JWT for the protected calls.',
    endpoints: [
      {
        name: 'Forgot Password',
        method: 'POST',
        path: 'api/v1/auth/forgot-password',
        description: 'Always responds success (avoids account enumeration); sends a reset link if the email exists.',
        body: { email: 'user@example.com' }
      },
      {
        name: 'Log Out Session By Token',
        method: 'GET',
        path: 'api/v1/auth/session/logout',
        description: 'PUBLIC, tokenised "log me out" link emailed on a new-device sign-in. Takes NO JWT — it authenticates on the unguessable token in the query string.',
        query: [{ key: 'token', value: '<emailed-token>' }]
      },
      {
        name: 'Update Push Token',
        method: 'POST',
        path: 'api/v1/auth/update-push-token',
        description: 'Registers the device push token. Requires auth. device_type = android|ios|web. Needs the X-Device-Id header: the server upserts a device row { user: <token id>, deviceId } with actor = the person. On a DELEGATED token the legacy User.notificationToken mirror is not written (a director\'s handset never replaces the owner\'s); company pushes reach it only while the membership is active. Validation errors are 400 VALIDATION_FAILED.',
        body: { notification_token: '<fcm-or-onesignal-token>', device_type: 'android' }
      },
      // `POST /auth/logout` lives in the Identity section: the new PUBLIC,
      // always-200 handler now answers that path for both token kinds.
      {
        name: 'My Profile',
        method: 'GET',
        path: 'api/v1/user/profile',
        description: 'Profile section for the logged-in user: name, dob/incorporation date, email, mobile, PAN (masked for everybody). A DELEGATED session gets the company with email, mobile and dob (incorporation date) MASKED too, e.g. "a••••••@ashatraders.in", "••••••3210", "••/••/••••".'
      },
      {
        name: 'Active Sessions',
        method: 'GET',
        path: 'api/v1/user/sessions',
        description: 'The CALLER\'s own sessions on the token\'s account: { sessions: [{ sid, current, createdAt, lastSeenAt, device: { name, platform, appVersion }, place, actor }] }. Owner session: the owner\'s rows (actor null). Delegated session: only this director\'s delegated sessions on the company. The owner cannot see directors\' devices (v1).'
      },
      {
        name: 'End One Session',
        method: 'DELETE',
        path: 'api/v1/user/sessions/:sid',
        description: 'Signs out one of the caller\'s OWN other sessions (same scope as Active Sessions). 200 "Signed that device out." { sid }. 422 when :sid is the current session (use Logout), 404 "That session was not found." for a sid outside your own list. No errorCode on these errors.',
        pathVars: [{ key: 'sid', value: '<sid from Active Sessions>' }]
      },
      {
        name: 'Log Out Other Devices',
        method: 'POST',
        path: 'api/v1/user/sessions/logout-others',
        description: 'No body. Scope is fixed server-side to the caller\'s actor — a client cannot ask for account scope. Owner: the owner\'s other devices, never a director\'s. Delegated: that director\'s other delegated sessions on this company only. Returns { removed }. 400 for a legacy token without sid.'
      },
      /*
       * GONE, NOT MISSING — the four `/user/account-links` routes and the stale
       * `GET /user/account-links/:userId` entry that never had a route at all.
       * RBAC_MASTER_PLAN.md §11.2 retires `AccountLink` deliberately: it was the last
       * remaining way to bind two separate identities into one session group, which is
       * the problem the identity redesign exists to remove. §5.4's workspace switcher
       * replaces it — see the Identity section — and the good part of the old switch
       * bookkeeping already lives inside `sessionService`.
       */
      {
        name: 'Plan / Subscription Status',
        method: 'GET',
        path: 'api/v1/user/plan-status',
        description: 'Current subscription/trial status + plan limits. A director sees the COMPANY\'s plan. THE SEAT PAIR HERE IS THE LEGACY COUNT, NOT §7.10\'s. memberLimit = memberLimitOf(plan) as stored (-1 unlimited; ladder trial 2 / individual 1 / starter 3 / growth 7 / pro 15 / enterprise -1, plus a +5 seat pack; a row without the field reads as 1) and is NOT reduced for a lapsed plan. seatsUsed = accountMemberService.seatsUsed: 1 (owner) + old-style AccountMembership rows in active | pending_approval, whatever their role; new-model staff are not counted. The authoritative pair (seat-consuming roles only: Administrator and Clerk pay, Accountant and Viewer are free, a SUSPENDED member is free; effective limit 1 from day 61 after the plan\'s end date) is GET /v1/workspace/access `seats`.'
      },
      {
        name: 'Storage Status',
        method: 'GET',
        path: 'api/v1/user/storage-status',
        description: 'Storage usage summary for the logged-in user.'
      },
      { name: 'Credits Wallet', method: 'GET', path: 'api/v1/user/credits', description: 'Two-bucket wallet per module: plan allowance for this cycle (planAllowed/planUsed/planRemaining + resetAt, no carryover) plus the purchased topupBalance (never expires) and the spendable `available` total.' },
      { name: 'Credit History', method: 'GET', path: 'api/v1/user/credits/history', description: 'Credit ledger for the logged-in user, newest first — allocate / reset / topup / consume / refund / admin_adjust.', query: [{ key: 'module', value: '', description: 'gst|roc|tds|itr|investment (optional)' }, { key: 'limit', value: '50' }] },
      { name: 'Manual Refresh', method: 'POST', path: 'api/v1/user/manualRefresh/:type', description: 'Re-fetch a module\'s data, spending a credit. type = module key (gst | roc | tds | itr | investment).', pathVars: [{ key: 'type', value: 'gst' }], body: {} },
      { name: 'Reminders', method: 'GET', path: 'api/v1/user/reminders', description: 'Compliance reminders (due/overdue nudges) for the user.' },
      { name: 'Dismiss Reminder', method: 'POST', path: 'api/v1/user/reminders/:id/dismiss', pathVars: [{ key: 'id', value: '<reminderId>' }] }
    ]
  },

  /*
   * The NEW identity model. RBAC_MASTER_PLAN.md §3 (signup), §5.1-§5.2 (sign-in),
   * §5.4 (the switcher), §5.7 (the email gate) and §3.1 (the workspace PAN).
   *
   * These routes are LIVE on the server today — `signupRoutes`, `identityAuthRoutes`
   * (plus its `tenantRouter`), `workspaceRoutes` and `metaRoutes`, all mounted in
   * `routes/app/v1/index.ts` AHEAD of the legacy PAN-first `authRoutes`, which still
   * answers until §12 retires it. `POST /auth/logout` is the one path declared in
   * both files, and the new handler shadows the legacy one as a superset.
   * GET /v1/workspace/access (§7.12) and GET /v1/meta/permissions (§6.4) are BUILT.
   */
  identity: {
    key: 'identity',
    name: 'Identity — Signup & Sign-in (new)',
    description:
      'Signup is five screens and nothing is typed twice (§3.1 business, §3.2 individual). Sign-in is ONE BOX — a mobile, a verified email or the §4.5 username — and a password; the client disambiguates silently (10 digits → mobile, contains @ → email, otherwise → username, lowercased) and the box never hints whether an identifier exists (§8.2). ' +
      'NO SESSION EXISTS during signup or during the public half of sign-in, so what stands in for one is the draft token plus a code answered on THIS attempt; re-opening a draft clears the proof, which is why a resume link skips the typing and never the proof. ' +
      'ONE LIMITER over the whole public family: 300 per 15 minutes per IP on its own Redis prefix, because one sign-in is two to four calls behind carrier-grade NAT. It fails OPEN; the per-identifier caps that decide whether an SMS is paid for are counted in Mongo and fail CLOSED. ' +
      'A 401 MEANS EXACTLY ONE THING (§8.9): the session named by this sid is no longer live. Every other refusal arrives as 403 / 409 / 422 / 429 and is drawn from its own code — one refusal tagged wrong is a user silently signed out. ' +
      'Set {{token}} (a NEW-model session: sub + sid + tid + mid) only for the session half — workspaces, switch, the email gate, tenant/pan, step-up, workspace/access, meta/permissions, devices and logout-all. Logout is PUBLIC and sends the bearer if it has one.',
    endpoints: [
      // ── §3 signup, public ──
      {
        name: 'Signup — Screen 1, Mobile',
        method: 'POST',
        path: 'api/v1/signup/mobile',
        description: 'Ten digits behind a fixed +91, under the itemised consent notice (§10.1). Opens a `pending_signups` draft — never an account — and sends the first code. The reply names no existing account: identical copy, status and latency whether the number is known or not.',
        body: { mobile: '9876543210' }
      },
      {
        name: 'Signup — Resend Code',
        method: 'POST',
        path: 'api/v1/signup/mobile/resend',
        description: 'Same draft, a fresh code. Counted against the per-identifier cap in Mongo, not the per-IP limiter.',
        body: { draftToken: '<from screen 1>' }
      },
      {
        name: 'Signup — Screen 2, Verify Code',
        method: 'POST',
        path: 'api/v1/signup/mobile/verify',
        description: 'The FIRST AND ONLY place an existing account is named, and only after a correct code (§8.2). A 6-digit code, so SMS autofill is fine here.',
        body: { draftToken: '<from screen 1>', code: '123456' }
      },
      {
        name: 'Signup — Screen 3, Business or Individual',
        method: 'POST',
        path: 'api/v1/signup/kind',
        description: 'One tap, and the fork: business goes to the company PAN, individual to DigiLocker. Moved from in front of sign-in to step 3 of signup.',
        body: { draftToken: '<draft>', kind: 'business' }
      },
      {
        name: 'Signup — Screen 4 (business), Company PAN',
        method: 'POST',
        path: 'api/v1/signup/company-pan',
        description: 'The PAN goes out to KYC and the name, type and incorporation date come back to be confirmed. §3.4 discovers the GSTINs from it — one tax identity in, the rest found.',
        body: { draftToken: '<draft>', pan: 'ABCDE1234F' }
      },
      {
        name: 'Signup — Screen 4 (business), Confirm',
        method: 'POST',
        path: 'api/v1/signup/company-pan/confirm',
        description: 'Confirms what the lookup returned. Nothing is retyped.',
        body: { draftToken: '<draft>' }
      },
      {
        name: 'Signup — Screen 4 (individual), Start DigiLocker',
        method: 'POST',
        path: 'api/v1/signup/identity/start',
        description: 'Decision R17 reverses the direction of the old screen: DigiLocker is the SOURCE of the name and date of birth, not a test against a typed PAN.',
        body: { draftToken: '<draft>' }
      },
      {
        name: 'Signup — Screen 4 (individual), Verify DigiLocker',
        method: 'POST',
        path: 'api/v1/signup/identity/verify',
        description: 'Completes the DigiLocker leg. The name it returns is pre-filled and NOT editable on screen 5.',
        body: { draftToken: '<draft>' }
      },
      {
        name: 'Signup — Screen 5, Complete',
        method: 'POST',
        path: 'api/v1/signup/complete',
        description: 'The one write to the real tables: the person, the tenant and the owner membership. ONE password box and no confirm-password field anywhere in the product (decision L9). §4.5 mints the username here; it is shown on a dashboard card (R15) and never typed.',
        body: { draftToken: '<draft>', name: 'Asha Nair', email: 'asha@example.com', password: '<password>' }
      },
      {
        name: 'Signup — Resume a Stopped Draft',
        method: 'POST',
        path: 'api/v1/signup/resume',
        description: '§3.3: the nudge link, or the same number typed again. Always costs a fresh code.',
        body: { mobile: '9876543210' }
      },
      {
        name: 'Signup — Stop the Nudges',
        method: 'GET',
        path: 'api/v1/signup/stop',
        description: '§3.3\'s opt-out. A GET because it is one tap in an SMS, and public because whoever taps it has no account and no session.',
        query: [{ key: 'token', value: '<opt-out token from the SMS>' }]
      },
      // ── §5.1-§5.2 sign-in, public ──
      {
        name: 'Sign In',
        method: 'POST',
        path: 'api/v1/auth/login',
        description: '§5.1. A known handset answers with a session; an unknown one, or one unseen for 30 days, answers a ticket and sends a code (§5.2) — a `next`, not an error. `deviceSecret` is a secret the app STORED, never an identifier the handset claims about itself, and it lives in secure storage so a forced sign-out does not make every sign-out look like a new phone.',
        body: { identifier: '9876543210', password: '<password>', deviceSecret: '<stored secret, optional>' }
      },
      {
        name: 'Sign In — New Device Code',
        method: 'POST',
        path: 'api/v1/auth/login/device',
        description: '§5.2. `remember` is the "Remember this device for 30 days" tick box.',
        body: { ticket: '<from sign-in>', code: '123456', remember: true }
      },
      {
        name: 'Sign In — Resend Device Code',
        method: 'POST',
        path: 'api/v1/auth/login/device/resend',
        body: { ticket: '<from sign-in>' }
      },
      // ── §5.4 the switcher, session ──
      {
        name: 'My Workspaces',
        method: 'GET',
        path: 'api/v1/auth/workspaces',
        description: '§5.4. A workspace whose plan has lapsed is LISTED, badged "Payment due", and opens read-only — the call never refuses it (decision R6). A person with none gets a 200 and §5.4\'s NoWorkspaceScreen, never a 401 and never a sign-out.'
      },
      {
        name: 'Switch Workspace',
        method: 'POST',
        path: 'api/v1/auth/workspace/switch',
        description: '§5.4. Swaps the session token IN THE SAME RESPONSE, so the app is never tokenless. This is ONE identity moving between its own workspaces, not the retired account switcher — which is what let §11.2 delete /user/account-links outright.',
        body: { tenantId: '<from My Workspaces>' }
      },
      // ── §5.7 the email gate, session ──
      {
        name: 'Email Gate — Status',
        method: 'GET',
        path: 'api/v1/auth/email/status',
        description: '§5.7. These four stay reachable for a person the gate is blocking — the gate lives in the app rather than as a refusal in front of them, because a gated person whose verify endpoint is gated can never leave. The gate is keyed on the PERSON, so it blocks every workspace.'
      },
      { name: 'Email Gate — Verify', method: 'POST', path: 'api/v1/auth/email/verify', body: { code: '123456' } },
      { name: 'Email Gate — Resend', method: 'POST', path: 'api/v1/auth/email/resend' },
      {
        name: 'Email Gate — Change Address',
        method: 'POST',
        path: 'api/v1/auth/email/change',
        description: 'The escape hatch that stops the gate being a lockout (§5.7).',
        body: { email: 'asha@example.com' }
      },
      // ── §3.1 the workspace PAN, session ──
      {
        name: 'Attach Workspace PAN',
        method: 'POST',
        path: 'api/v1/tenant/pan',
        description: '§3.1 / §3.2\'s PAN arriving inside a LIVE session instead of a signup draft — the route the app\'s PAN re-verify screen needed and never had, because the old flow finished by minting a second session. The tenant comes ONLY from the session row: `X-Tenant-Id` does not exist as an input anywhere (§8.7 rule 2).',
        body: { pan: 'ABCDE1234F' }
      },
      // ── §7.12 / §6.4 access and vocabulary, session ──
      {
        name: 'Workspace Access',
        method: 'GET',
        path: 'api/v1/workspace/access',
        description: 'ANY_MEMBER — a live session and an active membership, nothing more: this is the call that TELLS the app what the person may do, so it is never gated on a permission. §7.12\'s envelope: { workspace: { id, name, kind, status (active|grace|read_only|seats_collapsed|suspended), readOnly, paymentDue }, isOwner, role: { id, name, isSystem, systemKey? }, permissions[] (the §6.4 names this membership holds), ownerCapabilities[] (§6.2 ids; empty for staff), modules: { gst|roc|tds|itr|investment: { enabled, limit } }, seats: { used, limit } (-1 unlimited), owner: { name }, plan: { status, readOnly, paymentDue, staffSuspended }, accessVersion, membersEnabled }. accessVersion is the number the X-Access-Version response header carries; a role, membership or plan write bumps it so the change lands on the next tap. Replaces the legacy GET /account/me/permissions.'
      },
      {
        name: 'Permission Catalog',
        method: 'GET',
        path: 'api/v1/meta/permissions',
        description: 'ANY_MEMBER (a session, no permission). §6.4\'s served vocabulary — the words behind the 26 names: { groups: [{ id, title, subtitle, view, permissions: [{ key, label, seat, ownerOnlyToGrant? }] }] }. `seat` marks a permission that makes a role seat-consuming (§7.10); `ownerOnlyToGrant` marks team.manage and roles.manage (§6.3). Clients read the list from here and never carry one of their own.'
      },
      // ── §8.5 step-up, session ──
      {
        name: 'Step-Up — Start',
        method: 'POST',
        path: 'api/v1/auth/step-up/start',
        description: 'ANY_MEMBER — a step-up proves WHO is acting and is never itself the gate; each gated route keeps its own permission. Closed body { action }; an unknown action is 422. Texts a 6-digit code to the SESSION\'S OWN mobile, so there is no identifier to enumerate. Class B ids — team.staff (suspend/reactivate/remove staff, setup resend; Add Staff needs none), team.staff.role (change a role), team.roles (custom-role writes), billing.purchase, credential.link, vault.bulk_export, vault.pin_reset — mint a token reusable for 10 minutes; Class A ids are single use. 200 { action, class, fresh, maskedMobile, resendIn, expiresAt }. Bounded by the per-mobile code budget and 5 guesses per code, counted in Mongo and failing CLOSED (429 / 503) — never 401.',
        body: { action: 'team.staff' }
      },
      {
        name: 'Step-Up — Verify',
        method: 'POST',
        path: 'api/v1/auth/step-up/verify',
        description: 'Closed body { action, code }. The code is bound to the ACTION it was started for — one started for team.staff cannot mint team.staff.role. 200 "Confirmed." { stepUpToken, expiresIn (seconds), expiresAt, action, class, fresh }: send stepUpToken as the X-Step-Up header on the gated call (add it by hand in Postman). A wrong, expired or spent code is one 422 OTP_INVALID sentence (§8.2, §8.9). A gated route without a valid token answers 403 AUTH_STEP_UP_REQUIRED { action, class, fresh } and never 401.',
        body: { action: 'team.staff', code: '123456' }
      },
      // ── §5.2 devices and §8.6 sign-out ──
      {
        name: 'My Devices',
        method: 'GET',
        path: 'api/v1/auth/devices',
        description: 'ANY_MEMBER, no permission and no step-up: these rows are the PERSON\'s own handsets (keyed on the person, not the workspace). 200 { devices: [{ id, name, platform?, current, trusted, lastUsedAt?, trustedUntil? }], maxTrusted, trustDays }. Masked by default — no IP, city, push token or client-minted deviceId.'
      },
      {
        name: 'Remove Device',
        method: 'DELETE',
        path: 'api/v1/auth/devices/:id',
        description: '§5.2\'s Remove. :id is the device ROW id from My Devices, never the client deviceId, re-read with the person in the filter: a device that is not yours is 404, never 403. Forgets the trust AND ends that handset\'s sessions; removing the phone in your hand is allowed and the answer says so. 200 { id, trusted: false, current, sessionsEnded, signedOut, message }. No step-up — §8.5 leaves Remove off both lists.',
        pathVars: [{ key: 'id', value: '<devices[].id>' }]
      },
      {
        name: 'Logout',
        method: 'POST',
        path: 'api/v1/auth/logout',
        description: 'PUBLIC by design and ALWAYS 200 — even with a dead, missing or unverifiable token (§8.6 rule 8: a 401 or a 422 on logout makes clients loop). The handler reads the bearer itself and does nothing at all when it will not verify. Ends THIS session only — a new-model sub+sid token or a legacy id+sid token — and deletes this device\'s push token; { forgetDevice: true } also revokes the device trust (anything else means no). 200 { forgotDevice }. It shadows the legacy POST /auth/logout as a superset.',
        body: { forgetDevice: false }
      },
      {
        name: 'Logout Everywhere',
        method: 'POST',
        path: 'api/v1/auth/logout-all',
        description: 'ANY_MEMBER and NO step-up (§8.6 rule 9 — demanding a code to lock down a possibly-compromised account is backwards). Ends every session this person has; device trust is left alone. 200 { sessionsEnded, devicesForgotten: 0, message }.'
      }
    ]
  },

  /*
   * Staff on the NEW model — `routes/app/v1/staffRoutes.ts` + `teamRoleRoutes.ts`
   * mounted at `/team`, and the staff member's own half under `/auth/setup`
   * (`identityAuthRoutes`). RBAC_MASTER_PLAN.md §4.1-§4.4, §6, §7.3, §7.10, §8.5.
   *
   * GONE, NOT MISSING: every invitation / claim / `login/password` /
   * `pendingInvites` row and the `/account/memberships` family (create, my
   * memberships, enter, leave). Decision R21: no invitation exists anywhere, and
   * R22: a new staff member sets their password through an EMAILED single-use
   * 72-hour link. The `/account/members` family below is still mounted
   * (`accountMemberRoutes`) and is kept only as LEGACY.
   */
  account: {
    key: 'account',
    name: 'Team & Access (staff)',
    description:
      'A company workspace\'s staff on the NEW identity model (RBAC_MASTER_PLAN.md §4.1-§4.4, §6, §7.3, §7.10, §8.5). There is NO invitation anywhere (decision R21): the admin CREATES the staff member ACTIVE at once, and the person chooses their own password through an EMAILED single-use 72-hour link (R22) — the admin never sees, sets or resets it. ' +
      'Every /team route needs a NEW-model session ({{token}} from Identity → Sign In: sub + sid + tid + mid); the tenant comes only from that session (§8.7 rule 2). Reads need team.read; every staff write needs team.manage, which the owner holds through the everything-role and an Administrator holds too (L1). ' +
      'Only the OWNER may assign a role carrying team.manage or roles.manage (403 RBAC_OWNER_ONLY); nobody may assign a role granting more than they hold (403 RBAC_PERMISSION_DENIED); a non-owner may not suspend, remove or re-role a colleague holding either (403 RBAC_SENIORITY_DENIED); nobody acts on their own row or the owner\'s (403 RBAC_PERMISSION_DENIED, data.reason self | owner_membership). An individual workspace has no team: 403 TEAM_UNAVAILABLE. ' +
      'FIVE actions need an X-Step-Up header (§8.5, Class B, reusable for 10 minutes): team.staff for suspend, reactivate, remove and setup/resend, team.staff.role for the role change. Mint it with Identity → Step-Up Start then Verify and add the header by hand; without it the answer is 403 AUTH_STEP_UP_REQUIRED { action, class, fresh }. ' +
      'A 401 MEANS ONLY "this session is over" (§8.9): every refusal here is 403 / 404 / 409 / 422 / 429 with an errorCode. Rows marked LEGACY are the pre-RBAC /account co-user API on the legacy JWT.',
    endpoints: [
      // ── §4.3 / §4.1 — the team, new model ──
      {
        name: 'List Team Roles',
        method: 'GET',
        path: 'api/v1/team/roles',
        description: 'team.read or roles.manage (403 RBAC_PERMISSION_DENIED otherwise). { roles } — the four system roles (Administrator, Accountant, Clerk, Viewer) and this workspace\'s custom roles; roles[].id is the `role` Add Staff and Change Role take. The three writes on /team/roles need roles.manage plus X-Step-Up team.roles.'
      },
      {
        name: 'List Staff',
        method: 'GET',
        path: 'api/v1/team/staff',
        description: 'team.read (team.manage is NOT needed to look). §4.3\'s team list, keyset-paged on _id ascending, so a colleague added mid-scroll neither duplicates nor hides a row: pass nextCursor back as cursor (opaque; one the server cannot read is 422). limit 1-100, default 25; status = active | suspended (`invited` is refused 422 — no row carries it, R21); any other key is 422. 200 { members: [{ id (MEMBERSHIP id), name, username (only when this workspace minted it, else null), status, isOwner, isYou, title, role: { id, name, systemKey?, seatConsuming }, contact: { mobile, email } (BOTH masked at the source), lastActiveAt, joinedAt, setupPending (no password chosen yet), can: { changeRole, suspend, reactivate, remove, resendSetup }, seniorityLocked }], nextCursor | null }. `can` is decided by the server for THIS reader; the app draws it and never recomputes it.',
        // Only limit is pre-filled: the generator sends every listed param and an
        // EMPTY cursor or status is refused 422. Add them by hand when needed.
        query: [
          { key: 'limit', value: '25', description: '1-100, default 25. Optional (add only with a value): status = active | suspended, cursor = nextCursor' }
        ]
      },
      {
        name: 'Read Staff Member',
        method: 'GET',
        path: 'api/v1/team/staff/:id',
        description: 'team.read. :id is the MEMBERSHIP id (members[].id), re-read with the tenant in the filter: another workspace\'s id and one that never existed both answer 404 NOT_FOUND "That person is not in this workspace." (never 403 — §8.7 rule 1), and a malformed id answers 422 with the same sentence. 200 { member } — the list row plus addedAt, addedBy { id, name } | null, suspendedAt, suspendedBy { id, name } | null, suspendReason | null and permissions[] (the resolved grant of their role).',
        pathVars: [{ key: 'id', value: '<membershipId>' }]
      },
      {
        name: 'Add Staff Member',
        method: 'POST',
        path: 'api/v1/team/staff',
        description: 'team.manage (no X-Step-Up on this route). §4.1\'s one screen with a CLOSED body — unknown keys are 422, so no username, password, pan, status or isOwner can ride along: name 2-80; mobile, Indian only (10 digits starting 6-9, +91 / 0 tolerated); email REQUIRED, ≤ 254 — the set-password link goes there; role, a 24-hex id from List Team Roles (another workspace\'s → 404); title optional, ≤ 60. The member is ACTIVE at once — no invitation, no `invited` status (R21). A person new to Foldy is emailed a single-use set-password link valid 72 hours (R22); one who already has an account is emailed a plain notice. 201 "Staff member added." { membershipId, name, role: { id, name }, status: "active", title?, seats: { used, limit } } — BYTE-IDENTICAL in both branches (§8.2), so the response never answers "is this mobile on Foldy?". Refusals: 409 TEAM_MEMBER_EXISTS { membershipId } (already someone in THIS workspace); 409 TENANT_SEAT_UNAVAILABLE { limit, used, needed } or 409 TENANT_PLAN_CHANGE_PENDING, and nothing is written; 403 RBAC_OWNER_ONLY / RBAC_PERMISSION_DENIED for a role you may not assign; 403 TEAM_UNAVAILABLE on an individual workspace; 429 OTP_SEND_LIMIT { retryAfterSeconds } past 10 adds per 15 minutes or 40 per day; 503 when the server cannot build the link.',
        body: { name: 'Asha Nair', mobile: '9876543210', email: 'asha@example.com', role: '<roles[].id from List Team Roles>', title: 'Accounts — GST' }
      },
      // ── §4.4 — the membership actions, X-Step-Up gated ──
      {
        name: 'Change Staff Role',
        method: 'PATCH',
        path: 'api/v1/team/staff/:id/role',
        description: 'team.manage + X-Step-Up team.staff.role (add the header by hand). Closed body { role, acknowledgeAlertShrink? }. Takes effect on their very next tap — the access version is bumped in the same write. Refusals: 403 AUTH_STEP_UP_REQUIRED; 422 "They already have the … role."; 404 for a role or member not in this workspace; 403 RBAC_OWNER_ONLY / RBAC_PERMISSION_DENIED / RBAC_SENIORITY_DENIED; 409 TENANT_SEAT_UNAVAILABLE when a free role becomes a paid one and no seat is free; 409 TEAM_ALERT_SHRINK_UNCONFIRMED { modules, person, acknowledge: "acknowledgeAlertShrink" } when the change would leave a module\'s alerts with the owner alone — show the message, then retry with acknowledgeAlertShrink: true. 200 "Role changed." { membershipId, person: { id, name }, status, role: { id, name }, seats: { used, limit }, alertsEmptied[] }.',
        pathVars: [{ key: 'id', value: '<membershipId>' }],
        body: { role: '<roles[].id>', acknowledgeAlertShrink: false }
      },
      {
        name: 'Suspend Staff Member',
        method: 'POST',
        path: 'api/v1/team/staff/:id/suspend',
        description: 'team.manage + X-Step-Up team.staff. Closed body { reason? (≤ 200, "" = none), acknowledgeAlertShrink? }. Frees the seat AT ONCE (R18) and ends their sessions in THIS workspace only — their device trust and other workspaces are untouched. Refusals: 403 AUTH_STEP_UP_REQUIRED; 409 MEMBERSHIP_NOT_SUSPENDABLE when already suspended; 409 TEAM_ALERT_SHRINK_UNCONFIRMED (retry with acknowledgeAlertShrink: true); 429 TEAM_CHURN_LIMIT { retryAfterSeconds } after 3 suspend/reactivate transitions of one person in 24 h (the owner is told); plus the seniority / self / owner 403s. 200 "Access suspended." with the same result shape as Change Staff Role.',
        pathVars: [{ key: 'id', value: '<membershipId>' }],
        body: { reason: 'On leave until March', acknowledgeAlertShrink: false }
      },
      {
        name: 'Reactivate Staff Member',
        method: 'POST',
        path: 'api/v1/team/staff/:id/reactivate',
        description: 'team.manage + X-Step-Up team.staff. Takes NO body — any key is 422. Takes a seat again: a full workspace answers 409 TENANT_SEAT_UNAVAILABLE { limit, used, needed } and nothing is written. Also 409 MEMBERSHIP_NOT_SUSPENDABLE when already active and 429 TEAM_CHURN_LIMIT. 200 "Access restored." with the same result shape as Change Staff Role.',
        pathVars: [{ key: 'id', value: '<membershipId>' }]
      },
      {
        name: 'Remove Staff Member',
        method: 'DELETE',
        path: 'api/v1/team/staff/:id',
        description: 'team.manage + X-Step-Up team.staff. Optional closed body { acknowledgeAlertShrink } — 409 TEAM_ALERT_SHRINK_UNCONFIRMED first when the removal would empty a module\'s alert list. HARD-deletes the membership (no tombstone; history lives in the audit log), ends their sessions in this workspace, voids any contact-change proposal this workspace has open against them and frees the seat. Their person row, username, device trust and other workspaces are untouched. 200 with a body, not 204: "Removed from the workspace." with status "removed" and the seat numbers.',
        pathVars: [{ key: 'id', value: '<membershipId>' }]
      },
      {
        name: 'Resend Set-Password Email',
        method: 'POST',
        path: 'api/v1/team/staff/:id/setup/resend',
        description: 'team.manage + X-Step-Up team.staff. Takes NO body — the link is system-generated. Only while the row\'s setupPending is true and only for the workspace that CREATED the person (row.can.resendSetup); once they have chosen a password it is theirs: 403 RBAC_NOT_MANAGED_PERSON (they use Forgot password). Re-mints the link and restarts the 72-hour window. 429 OTP_SEND_LIMIT { retryAfterSeconds } within 60 s of the last send or after 3 sends in one window; 422 VALIDATION_FAILED when no email is on file. 200 { membershipId, person: { id, name }, sentTo (masked) | null, expiresAt, sends: { used, limit }, resendIn } — identical whether the email went out or was dropped by the silent recipient cap (§8.2). The link is never in the response.',
        pathVars: [{ key: 'id', value: '<membershipId>' }]
      },
      // ── §4.2 — the staff member's own half, PUBLIC ──
      {
        name: 'Set-Password Page (from the email)',
        method: 'GET',
        path: 'api/v1/auth/setup',
        description: 'PUBLIC — the page the emailed link opens. Server-rendered HTML, NOT JSON and not the ApiResponse envelope (Cache-Control: no-store). t = <membershipId>.<secret> exactly as the link carried it. 200 with the password form while the link is live; 422 with the same "This link is no longer valid" page for every way a link can be wrong (§8.2). The form posts to Complete Setup. Under the identity family\'s per-IP limiter; no {{token}} is needed.',
        query: [{ key: 't', value: '<membershipId>.<secret from the email>' }]
      },
      {
        name: 'Complete Setup (first password)',
        method: 'POST',
        path: 'api/v1/auth/setup/complete',
        description: 'PUBLIC. Closed body { t, password }. Writes the staff member\'s FIRST password, once. Signup\'s password policy applies (at least 10 characters; one built from their name, mobile or the work email is 422 AUTH_WEAK_PASSWORD). A dead, spent, malformed or unknown link is one 422 AUTH_TICKET_INVALID sentence. The link is burned and the address it reached becomes their verified email when nobody else holds it. MINTS NO SESSION: 200 { next: "done", message } — they then sign in on POST /auth/login like anybody else.',
        body: { t: '<membershipId>.<secret from the email>', password: '<their new password>' }
      },
      // ── LEGACY — accountMemberRoutes on the legacy JWT (the Activity Log entry below is NOT legacy) ──
      {
        name: 'LEGACY — List Members',
        method: 'GET',
        path: 'api/v1/account/members',
        description: 'LEGACY — the pre-RBAC co-user API (accountMemberRoutes, legacy businessAuth JWT), still mounted until §12 retires it; the new model is List Staff. Owner session only (403 MEMBER_OWNER_ONLY for a delegated one). { members: [{ id, userId, name, nameWithheld, nameVerified, nameSource, sharesOwnerMobile, isPerson, maskedMobile, avatarUrl, role: { id, name } | null, status, title, isOwner, lastAccessAt }] }. Seeds the system roles and the owner row as a side effect.'
      },
      {
        name: 'LEGACY — Suspend / Re-activate Member',
        method: 'PATCH',
        path: 'api/v1/account/members/:id',
        description: 'LEGACY — the pre-RBAC co-user API, still mounted; the new model is Suspend / Reactivate Staff Member. Owner session. :id = legacy membership id. status active | suspended.',
        pathVars: [{ key: 'id', value: '<membershipId>' }],
        body: { status: 'active' }
      },
      {
        name: 'LEGACY — Change Member Role',
        method: 'PATCH',
        path: 'api/v1/account/members/:id/role',
        description: 'LEGACY — the pre-RBAC co-user API, still mounted; the new model is Change Staff Role. Owner session. 200 "Role updated." { roleId }.',
        pathVars: [{ key: 'id', value: '<membershipId>' }],
        body: { roleId: '<roleId>' }
      },
      {
        name: 'LEGACY — Remove Member',
        method: 'DELETE',
        path: 'api/v1/account/members/:id',
        description: 'LEGACY — the pre-RBAC co-user API, still mounted; the new model is Remove Staff Member. Owner session. 200 "That person no longer has access." { removed: true }.',
        pathVars: [{ key: 'id', value: '<membershipId>' }]
      },
      {
        name: 'LEGACY — List Roles',
        method: 'GET',
        path: 'api/v1/account/roles',
        description: 'LEGACY — the pre-RBAC role API, still mounted; the new model is List Team Roles (GET /team/roles). { roles: [{ id, name, description, systemKey, isSystem, permissions[], moduleAccess }] }.'
      },
      {
        name: 'LEGACY — Create Custom Role',
        method: 'POST',
        path: 'api/v1/account/roles',
        description: 'LEGACY — the pre-RBAC role API, still mounted; the new model is POST /team/roles (roles.manage + X-Step-Up team.roles). The vocabulary is §6.4\'s 26 names, served at GET /v1/meta/permissions. 201 "Role created." { role }; 409 MEMBER_ROLE_NAME_TAKEN, 422 VALIDATION_FAILED.',
        body: { name: 'CA Firm', description: 'Our auditors', permissions: ['gst.read', 'itr.read', 'vault.read'] }
      },
      {
        name: 'LEGACY — Update Custom Role',
        method: 'PATCH',
        path: 'api/v1/account/roles/:id',
        description: 'LEGACY — the pre-RBAC role API, still mounted; the new model is PATCH /team/roles/:id. At least one of name / description / permissions (REPLACES the list). 403 MEMBER_ROLE_IMMUTABLE for a system role.',
        pathVars: [{ key: 'id', value: '<roleId>' }],
        body: { permissions: ['gst.read', 'itr.read', 'vault.read', 'reports.read'] }
      },
      {
        name: 'LEGACY — Delete Custom Role',
        method: 'DELETE',
        path: 'api/v1/account/roles/:id',
        description: 'LEGACY — the pre-RBAC role API, still mounted; the new model is DELETE /team/roles/:id. 409 MEMBER_ROLE_IN_USE while any membership holds it.',
        pathVars: [{ key: 'id', value: '<roleId>' }]
      },
      {
        name: 'LEGACY — Me Permissions',
        method: 'GET',
        path: 'api/v1/account/me/permissions',
        description: 'LEGACY — the pre-RBAC permission read, still mounted; GET /v1/workspace/access (Identity section) is BUILT and replaces it. { isOwner, accountName, roleName, permissions[], membersEnabled }.'
      },
      {
        name: 'Activity Log (audit)',
        method: 'GET',
        path: 'api/v1/account/audit',
        description: 'NOT LEGACY: auditRoutes on secured(), so it needs a NEW-model session (personAuth: sub + tid + mid; a legacy JWT gets 401 session_ended) and the audit.read permission. Always scoped to the session\'s account. Unknown query keys → 422. Newest first, keyset paged: pass nextCursor back as cursor. from/to accept ISO or bare YYYY-MM-DD (IST whole day; to must be ≥ from). Items: { id, createdAt, actor: { id, name, phoneMasked }, roleName, area, operation, action, targetType, targetId, description, outcome: pending|success|failure, statusCode }. area/operation examples: members/approve_member|remove_member|enter_account…, vault/upload|trash|restore|purge|download|lock_set…, <segment>/access_denied (gate refusals). Retention: deletions 6 years, downloads 12 months, everything else 1 year. Not flag-gated.',
        // Only limit is pre-filled: the generator always sends every listed param, and an
        // EMPTY area/actor/operation/from/to/cursor is refused with 422. Add the optional
        // filters by hand: area (exact, e.g. members | vault | gst), actor (24-hex Person id),
        // operation (exact, e.g. trash | access_denied), from / to (ISO or YYYY-MM-DD, IST),
        // cursor (nextCursor from the previous page).
        query: [
          { key: 'limit', value: '50', description: '1-100, default 50. Optional (add only with a value — empty is 422): area, actor, operation, from, to, cursor' }
        ]
      }
    ]
  },

  onboarding: {
    key: 'onboarding',
    name: 'Onboarding (PAN-first)',
    description: 'Single entry: POST /onboarding/pan handles both registration and login. New PAN → PAN + name + DOB demographic match (Sandbox) → registrationToken; registration then runs 2 OTP layers — Phone → Email — and create-profile returns a JWT. Existing PAN → SMS OTP to the registered mobile, then pan/verify-otp returns the JWT. All OTPs print to the server console in dev.',
    endpoints: [
      {
        name: 'Check PAN (registered?)',
        method: 'POST',
        path: 'api/v1/onboarding/pan/check',
        description: 'Presence check — is this PAN already registered? Returns { exists, mode } (login | register). No OTP, no side effects.',
        body: { pan: 'ABCDE1234F' }
      },
      {
        name: 'PAN Entry (Register or Login)',
        method: 'POST',
        path: 'api/v1/onboarding/pan',
        description: 'New PAN → demographic match on PAN + name + dob; on success returns mode:"register" + registrationToken + name. Existing PAN → SMS OTP to the registered mobile, returns mode:"login" + referenceId (name/dob ignored).',
        body: { pan: 'ABCDE1234F', name: 'John Doe', dob: '01/01/1990' }
      },
      {
        name: 'Verify OTP & Login (existing PAN)',
        method: 'POST',
        path: 'api/v1/onboarding/pan/verify-otp',
        description: 'Login only: verifies the SMS OTP from PAN Entry and returns { mode:"login", token, user } (JWT).',
        body: { referenceId: '<referenceId>', otp: '123456' }
      },
      {
        name: 'Send OTP — Phone / Email (Layers 1 & 2)',
        method: 'POST',
        path: 'api/v1/onboarding/otp/send',
        description: 'channel = "phone" or "email". Requires the registrationToken from PAN Entry.',
        body: { registrationToken: '<registrationToken>', channel: 'phone', value: '9876543210' }
      },
      {
        name: 'Verify OTP — Phone / Email (Layers 1 & 2)',
        method: 'POST',
        path: 'api/v1/onboarding/otp/verify',
        body: { registrationToken: '<registrationToken>', channel: 'phone', otp: '123456' }
      },
      {
        name: 'Verify via DigiLocker',
        method: 'POST',
        path: 'api/v1/onboarding/digilocker/verify',
        description: 'Identity check via DigiLocker during onboarding. Rate-limited and pre-JWT.',
        body: {}
      },
      {
        name: 'Create Profile (auto-login)',
        method: 'POST',
        path: 'api/v1/onboarding/create-profile',
        description: 'Requires Phone + Email verified. Returns { token, user }. name defaults to the identity-matched name.',
        body: { registrationToken: '<registrationToken>', name: 'John Doe' }
      }
    ]
  },

  'manual-uploads': {
    key: 'manual-uploads',
    name: 'Manual Uploads',
    description: 'Upload & manage compliance documents (S3-backed). Set {{token}} to a logged-in JWT.',
    endpoints: [
      {
        name: 'List Categories',
        method: 'GET',
        path: 'api/v1/manual-uploads/categories',
        description: 'Categories visible to the logged-in user, with resolved frequencies.'
      },
      {
        name: 'Upload Document',
        method: 'POST',
        path: 'api/v1/manual-uploads/:category/upload',
        description: 'multipart/form-data. period/frequency required for filing categories.',
        pathVars: [{ key: 'category', value: 'pf_esi' }],
        formdata: [
          { key: 'file', type: 'file', description: 'PDF/JPG/PNG/DOCX/XLSX, ≤ 1 MB' },
          { key: 'period', type: 'text', value: '04-2026', description: 'MM-YYYY or YYYY-YY' },
          { key: 'frequency', type: 'text', value: 'monthly', description: 'monthly|annual (only for PTAX)' }
        ]
      },
      {
        name: 'List My Documents',
        method: 'GET',
        path: 'api/v1/manual-uploads/:category/items',
        pathVars: [{ key: 'category', value: 'pf_esi' }],
        query: [
          { key: 'period', value: '04-2026', description: 'optional' },
          { key: 'frequency', value: 'monthly', description: 'optional' }
        ]
      },
      {
        name: 'Get Download Link',
        method: 'GET',
        path: 'api/v1/manual-uploads/items/:id/download',
        pathVars: [{ key: 'id', value: '<documentId>' }]
      },
      {
        name: 'Move Document to Trash',
        method: 'DELETE',
        path: 'api/v1/manual-uploads/items/:id',
        description: 'SOFT delete for every user (was a hard delete), flag on or off. Gate vault.delete. Stamps trashedBy/trashedByName/trashedByOwner; an owner gets no hold, a delegated session gets holdUntil = now + 7 days; purgeAt = now + 30 days. The file keeps counting toward storage, and a trashed filing no longer blocks uploading a replacement for the same period. 200 "Document moved to Trash." { id, holdUntil, purgeAt }. 404 NOT_FOUND (bad id, not yours, or already in Trash).',
        pathVars: [{ key: 'id', value: '<documentId>' }]
      },
      {
        name: 'List Trash',
        method: 'GET',
        path: 'api/v1/manual-uploads/trash',
        description: 'Gate vault.read. Newest deletion first, max 200, no paging: { items: [{ id, categoryKey, kind: filing|document, period, frequency, status, originalName, mimeType, originalSize, compressedSize, uploadedAt, uploadedByName, trashedAt, purgeAt, trashedByName, trashedByOwner, holdUntil }] }. Held = holdUntil != null && holdUntil > now (nobody, the owner included, can permanently delete it until then).'
      },
      {
        name: 'Restore from Trash',
        method: 'POST',
        path: 'api/v1/manual-uploads/items/:id/restore',
        description: 'Gate vault.delete. No body, no rate limit, no read-only check. 200 "Document restored." { id }. 404 NOT_FOUND. Two 409s WITHOUT an errorCode — tell them apart by message: "Another document is already filed for this period…" (a live filing holds the period) and "This document is being deleted permanently…" (purge race).',
        pathVars: [{ key: 'id', value: '<documentId>' }]
      },
      {
        name: 'Empty Trash',
        method: 'DELETE',
        path: 'api/v1/manual-uploads/trash',
        description: 'OWNER SESSION ONLY (gate OWNER_ONLY + requireOwnerSession → 403 MEMBER_OWNER_ONLY when delegated). No query — unlike the vault there is no listedAt. Marks and purges unheld rows (≤ 200 inline, the cron takes the rest); held rows are skipped. 200 { deleted, remaining, held, heldUntil } with message "Trash emptied." / "Deleted N document(s). M more will be removed shortly." plus " H document(s) deleted by others are protected until <date>." when some are held.'
      }
    ]
  },

  compliance: {
    key: 'compliance',
    name: 'Compliance Health',
    description: 'A single 0-100 compliance score plus the Action Center items behind it (GST late fees, ROC / TDS / ITR status). Auth only — no segment or module gate. Built from data already held, so it makes no provider calls. Set {{token}}.',
    endpoints: [
      { name: 'Compliance Health', method: 'GET', path: 'api/v1/compliance/health', description: 'Score + the actions dragging it down.' }
    ]
  },

  landing: {
    key: 'landing',
    name: 'Landing (Public)',
    description: 'PUBLIC pre-sign-in catalog served from /api/landing/v1 (also mirrored at /landing-page). No bearer token required.',
    endpoints: [
      { name: 'Landing Info', method: 'GET', path: 'api/landing/v1', description: 'Overview metadata for landing-page callers.' },
      { name: 'Landing Plans', method: 'GET', path: 'api/landing/v1/plans', description: 'Active subscription plans + credit packs. Optional workspace filter.', query: [{ key: 'workspace', value: 'business', description: 'business | individual (optional)' }] }
    ]
  },

  webhooks: {
    key: 'webhooks',
    name: 'Webhooks (Provider → Server)',
    description: 'Endpoints PROVIDERS call, mounted at /webhook (outside the /api tree). Each verifies a signature header rather than a JWT, so these are for inspection/replay — not something the app ever calls.',
    endpoints: [
      { name: 'Instafinancials Webhook', method: 'POST', path: 'webhook/instafinancials', description: 'ROC/LLP job callbacks. Verifies X-Webhook-Timestamp + X-Webhook-Signature against the webhook secret.', body: {} },
      { name: 'MoneyOne Webhook', method: 'POST', path: 'webhook/moneyone', description: 'Account-Aggregator consent + FI-data-ready callbacks.', body: {} },
      { name: 'Razorpay Webhook', method: 'POST', path: 'webhook/razorpay', description: 'Payment lifecycle events. Verifies x-razorpay-signature. payment.captured, order.paid and subscription.charged resolve the STORED PaymentOrder (or rebuild a legacy one from Razorpay) and call the same apply-once path as verify-payment. 200 for applied / already applied / not applied (flagged for support) / unattributable, 409 while in progress, 503 when the Razorpay lookup is unavailable (retryable). Unsigned deliveries (no RAZORPAY_WEBHOOK_SECRET) apply nothing unless mock mode AND the order id starts with order_mock_.', body: {} }
    ]
  },

  gst: {
    key: 'gst',
    name: 'GST',
    description: 'GST profiles, finance status & taxpayer-session APIs (B2B), powered by WhiteBooks (GSP). Server supplies email/IP/state/txn from env; you pass username, GSTIN, type & OTP. Set {{token}}.',
    endpoints: [
      {
        name: 'List Filing Alerts',
        method: 'GET',
        path: 'api/v1/b2b/gst/filing-alerts',
        description: 'Returns due today or overdue and still unfiled, most overdue first. Written nightly by gstNotificationCron; the app shows these once a day on first open. Each item carries daysOverdue (0 = due today) and isDueToday. Self-heals: anything since filed is resolved on read.'
      },
      {
        name: 'Dismiss Filing Alert',
        method: 'PATCH',
        path: 'api/v1/b2b/gst/filing-alerts/:id/dismiss',
        description: '"Already filed" — clears one alert. Needed because our filing status only syncs when the user opens a GST screen, so a return filed directly on the GST portal can still show as unfiled.',
        pathVars: [{ key: 'id', value: '<alertId>' }]
      },
      {
        name: 'Create GST Profile',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles',
        description: 'Verifies the GSTIN via WhiteBooks then saves a profile. No title is sent — the server builds it from the business name + an HQ/BR tag (first GSTIN added = "<name> HQ", rest = "<name> BR (<state code>)"). Also sends the GST-portal OTP to the registered mobile so you can authorise immediately (authorize/verify). gstUsername is stored for the session flow. One profile per (user, GSTIN).',
        body: { gstin: GSTIN, gstUsername: '<gst-portal-username>' }
      },
      {
        name: 'List GST Profiles',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles',
        description: 'All GST profiles saved by the logged-in Business.'
      },
      {
        name: 'Get GST Profile',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Delete GST Profile',
        method: 'DELETE',
        path: 'api/v1/b2b/gst/profiles/:id',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Resend OTP',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/authorize/otp',
        description: 'Re-sends the GST-portal OTP for this profile (Create GST Profile already sends the first one).',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Authorise (Verify OTP)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/authorize/verify',
        description: 'Verifies the OTP and persists the 6h taxpayer token on the profile (server-side, auto-refreshed).',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { otp: '123456' }
      },
      {
        name: 'Profile — Session Status',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/session',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Set as Primary',
        method: 'PATCH',
        path: 'api/v1/b2b/gst/profiles/:id/primary',
        description: 'Make this saved GSTIN the primary/default profile for the business (a business can hold several).',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Return Summary (stored token)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/summary/:type',
        description: 'Summary using the profile\'s stored token (no taxpayer_token needed). type = gstr1|gstr1a|gstr3b|gstr9|gstr9c|gstr2a|gstr2b; ret_period is MMYYYY. gstr2a/gstr2b return the auto-drafted ITC statements through this same endpoint — and nothing is recorded as "filed" for them, because the taxpayer never files them.',
        pathVars: [{ key: 'id', value: '<profileId>' }, { key: 'type', value: 'gstr2b' }],
        body: { ret_period: '042024' }
      },
      /*
       * The four ITC-statement routes the console has driven since 2026-09-09 and the
       * Postman collection never carried. Bucket C of `scripts/route-diff.mjs` is what
       * found them: a client method with no catalog entry ships a console that works
       * and a collection that cannot reproduce it.
       */
      {
        name: 'Profile — GSTR-2A (inward supplies)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/gstr2a',
        description: 'Auto-drafted inward-supply statement, by section (default b2b). ret_period is MMYYYY. Nothing is ever recorded as "filed" for 2A — the taxpayer does not file it.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { ret_period: '042024', section: 'b2b' }
      },
      {
        name: 'Profile — GSTR-2B (auto-drafted ITC)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/gstr2b',
        description: 'The auto-drafted ITC statement. ret_period is MMYYYY; `filenum` fetches one file of a multi-file statement.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { ret_period: '042024' }
      },
      {
        name: 'Profile — Generate GSTR-2B',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/gstr2b/generate',
        description: 'On-demand generation for a period the portal has not drafted yet. Returns an internal transaction id; poll the status route below with it rather than re-requesting the statement.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { ret_period: '042024' }
      },
      {
        name: 'Profile — GSTR-2B Generation Status',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/gstr2b/status/:intTranId',
        description: 'Progress of one generate request. A not-ready answer is a normal state, not an error.',
        pathVars: [{ key: 'id', value: '<profileId>' }, { key: 'intTranId', value: '<from Generate GSTR-2B>' }]
      },
      {
        name: 'Profile — Return Summary PDF (stored token)',
        method: 'POST',
        path: 'api/v1/b2b/gst/profiles/:id/summary/:type/pdf',
        description: 'The same return summary rendered as a PDF and streamed back as bytes (Content-Disposition: attachment) — nothing is written to disk or S3. type = gstr1|gstr1a|gstr3b|gstr9|gstr9c; ret_period is MMYYYY.',
        pathVars: [{ key: 'id', value: '<profileId>' }, { key: 'type', value: 'gstr1' }],
        body: { ret_period: '042024' }
      },
      {
        name: 'Profile — Sales Summary',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/sales-summary',
        description: 'GSTR-1 sales summary for the profile across a financial year (12-month roll-up), using the stored token. Also syncs filing status as a side effect.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        query: [{ key: 'fy', value: '2025-26', description: 'financial year, e.g. 2025-26' }]
      },
      {
        name: 'Mark Return as Filed',
        method: 'POST',
        path: 'api/v1/b2b/gst/mark-as-filed',
        description: 'Records a return as filed so the reminder cron stops nudging for it. All three fields required; period is MMYYYY.',
        body: { gstin: GSTIN, formType: 'GSTR-1', period: '042026' }
      },
      {
        name: 'Notice List (taxpayer session)',
        method: 'POST',
        path: 'api/v1/b2b/gst/notices/list',
        description: 'Notices via the ACTIVE TAXPAYER SESSION (GSTIN in the body) — distinct from the per-profile GET below, which reads a saved profile by id.',
        body: { gstin: '29ABCDE1234F1Z5', fromDate: '01-04-2024', toDate: '31-03-2025' }
      },
      {
        name: 'Notice Details (taxpayer session)',
        method: 'POST',
        path: 'api/v1/b2b/gst/notices/details',
        description: 'One notice\'s detail via the active taxpayer session.',
        body: { gstin: '29ABCDE1234F1Z5', refId: '<refId>' }
      },
      {
        name: 'Search & Save Taxpayer',
        method: 'POST',
        path: 'api/v1/b2b/gst/profile',
        description: 'Look a taxpayer up by GSTIN and persist it as a profile in one call.',
        body: { gstin: '29ABCDE1234F1Z5' }
      },
      {
        name: 'Set Profile Turnover Band',
        method: 'PATCH',
        path: 'api/v1/b2b/gst/profiles/:id/turnover-band',
        description: 'Sets the turnover band used for late-fee exposure maths.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { turnoverBand: 'upto_1_5_cr' }
      },
      {
        name: 'Profile Notices',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/notices',
        description: 'Notices issued in the ~last 60 days for the profile\'s GSTIN, using its stored token. Optional ?date=DD/MM/YYYY reference day (defaults to today). No taxpayer_token / email needed — injected server-side.',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Profile — Notice Details (stored token)',
        method: 'GET',
        path: 'api/v1/b2b/gst/profiles/:id/notices/:refid',
        description: 'Full detail for one notice — type, tax period, due date of reply, and attached-document metadata. refid comes from the List Notices response.',
        pathVars: [{ key: 'id', value: '<profileId>' }, { key: 'refid', value: '<noticeRefId>' }]
      },
      {
        name: 'Get Business Info',
        method: 'POST',
        path: 'api/v1/b2b/gst/get-business-info',
        description: 'Pure WhiteBooks GSTIN lookup (does not create a profile).',
        body: { gstin: GSTIN }
      },
      {
        name: 'Get Finance / Returns Status',
        method: 'POST',
        path: 'api/v1/b2b/gst/get-finance-status',
        description: 'Whole-year filing status for one GSTIN. returns.monthly now also carries GSTR2A and GSTR2B — auto-drafted ITC statements, so they use status Available|NotAvailable (never Filed/Due/Overdue) and have no dueDate. 2A exists from the start of the period; 2B appears once GSTN generates it on the 14th of the following month. They are EXCLUDED from summary.totalFiled/Overdue/Due and counted separately as summary.totalStatementsAvailable. gstr narrows BOTH the rows and the counts to a single form (GSTR1|GSTR1A|GSTR3B|GSTR9|GSTR9C|GSTR2A|GSTR2B, dash- and case-insensitive); leave it empty for the whole year. Anything else is a 400 rather than an empty schedule.',
        body: { gstin: GSTIN, financial_year: 'FY 2024-25', gstr: '' }
      },
      {
        name: 'Taxpayer — Generate OTP',
        method: 'POST',
        path: 'api/v1/b2b/gst/otp',
        description: 'type is required (GSTR1|GSTR3B|GSTR9|GSTR9C|GSTR1A); title is optional.',
        body: { username: '<gst-portal-username>', gstin: GSTIN, type: 'GSTR1', title: 'Q1 filing' }
      },
      {
        name: 'Taxpayer — Verify OTP',
        method: 'POST',
        path: 'api/v1/b2b/gst/otp/verify',
        body: { username: '<gst-portal-username>', gstin: GSTIN, otp: '123456' }
      },
      {
        name: 'Taxpayer — Refresh Session',
        method: 'POST',
        path: 'api/v1/b2b/gst/session/refresh',
        body: { taxpayer_token: '<taxpayer_token>' }
      },
      {
        name: 'GSTR-1 Summary',
        method: 'POST',
        path: 'api/v1/b2b/gst/gstr1/summary',
        body: { taxpayer_token: '<taxpayer_token>', gstin: GSTIN, year: '2024', month: '04', summary_type: 'long' }
      },
      {
        name: 'GSTR-1 B2B Invoices',
        method: 'POST',
        path: 'api/v1/b2b/gst/gstr1/b2b',
        body: { taxpayer_token: '<taxpayer_token>', gstin: GSTIN, year: '2024', month: '04' }
      },
      {
        name: 'Return Summary (by type)',
        method: 'POST',
        path: 'api/v1/b2b/gst/summary/:type',
        description: 'type path var = gstr1|gstr1a|gstr3b|gstr9|gstr9c. ret_period is MMYYYY (year/month optional).',
        pathVars: [{ key: 'type', value: 'gstr1' }],
        body: { taxpayer_token: '<taxpayer_token>', gstin: GSTIN, ret_period: '042024' }
      },
      {
        name: 'Annual Sales Summary',
        method: 'GET',
        path: 'api/v1/b2b/gst/sales-summary',
        query: [
          { key: 'gstin', value: GSTIN },
          { key: 'fy', value: '2024-25' },
          { key: 'taxpayer_token', value: '<taxpayer_token>' }
        ]
      },
      {
        name: 'Mark Return as Filed',
        method: 'POST',
        path: 'api/v1/b2b/gst/mark-as-filed',
        body: { gstin: GSTIN, formType: 'GSTR-1', period: '04-2024' }
      }
    ]
  },
  roc: {
    key: 'roc',
    name: 'ROC Documents',
    description: 'Company + LLP MCA documents from InstaFinancials. ONE guarded job drives everything: post an identifier and the server picks the stack (CIN/PAN → InstaDocs, LLPIN → LLPDocs). Delivery is asynchronous and slow (~30 min for LLPDocs, up to ~3 weeks for InstaDocs) and arrives by webhook, so poll GET /job — it reads our DB and costs no vendor call. Guards: one active job per user, and one order per 90 days counted from CREATION. Requires an active B2B plan.',
    endpoints: [
      {
        name: 'Order Documents',
        method: 'POST',
        path: 'api/v1/b2b/roc/job',
        description: 'The only call that spends money. Send ONE identifier: CIN or PAN (→ InstaDocs) or LLPIN (→ LLPDocs) — the type is detected from its shape. cin/pan/llpin are accepted as aliases for `identifier`. `name` is REQUIRED — the company/LLP name as entered by the user, stored on the job and shown on the ROC profile beside the CIN (accepted as `name` or `entityName`). Returns 202 + jobId. Refuses with 409 if a job is already in flight, or 429 while the 90-day cooldown is running.',
        body: { identifier: 'U69202WB2024PTC269500', name: 'ACME Solutions Pvt Ltd' }
      },
      {
        name: 'Job Status',
        method: 'GET',
        path: 'api/v1/b2b/roc/job',
        description: 'The current job + cooldown for the logged-in user. Reads our DB only (the vendor allows just 4 status pulls per order, which the reconciler cron owns), so this is free to poll. `canOrder` is the single flag the order button needs. Key job state off `status` (queued|processing|ready|failed|expired) — `error` is only ever populated on a terminal status (failed|expired), never for a job still running.'
      },
      {
        name: 'My Documents',
        method: 'GET',
        path: 'api/v1/b2b/roc/documents',
        description: 'Documents delivered by the webhook, grouped into the 16 MCA categories. Defaults to the latest ready job. downloadUrl links are permanent InstaFinancials URLs (we store metadata only, no file copy).',
        query: [
          { key: 'jobId', value: '', description: 'optional: a specific job (defaults to the latest ready one)' },
          { key: 'category', value: '', description: 'optional: narrow to one category, e.g. AOC 4' }
        ]
      },
      {
        name: 'Categorize Documents',
        method: 'POST',
        path: 'api/v1/b2b/roc/documents/categorize',
        description: 'Accepts the raw InstaDocs/LLPDocs report ({ ReportData: { InstaDocs|LLPDocs: { Document: [...] } } }), a { report } wrapper, or a bare Document array. Returns all 16 categories in order (empty ones included), each doc trimmed to name/date/size/downloadLink, newest-first.',
        body: {
          ReportData: {
            InstaDocs: {
              Document: [
                {
                  DocumentName: 'AOC-4 XBRL Form AOC-4(XBRL).pdf',
                  DocumentCategory: 'Annual Returns and Balance Sheet eForms',
                  DocumentFillingDate: '02-11-2024',
                  DocumentSize: 7.76,
                  DocumentLink: 'https://downloads.InstaFinancials.com/...'
                },
                {
                  DocumentName: 'Form MGT-7.pdf',
                  DocumentFillingDate: '20-09-2023',
                  DocumentSize: 1.2,
                  DocumentLink: 'https://downloads.InstaFinancials.com/...'
                }
              ]
            }
          }
        }
      },
      {
        name: 'Search Documents',
        method: 'GET',
        path: 'api/v1/b2b/roc/documents/search',
        description: 'Case-insensitive name search across the job\'s delivered documents (server-side — the paged lists never hold the full set). Omit category to search everything; defaults to the latest ready job.',
        query: [
          { key: 'q', value: 'MGT', description: 'search term (min 2 chars)' },
          { key: 'jobId', value: '', description: 'optional: a specific job (defaults to the latest ready one)' },
          { key: 'category', value: '', description: 'optional: scope to one category' },
          { key: 'limit', value: '20', description: 'optional page size' }
        ]
      },
      {
        name: 'MCA Company Master Data',
        method: 'POST',
        path: 'api/v1/b2b/roc/mca/company/master-data',
        description: 'Company/LLP master data from InstaFinancials by CIN or LLPIN (billable). Pass exactly one of cin | llpin.',
        body: { cin: 'U72900KA2021PTC145000' }
      }
    ]
  },

  profile: {
    key: 'profile',
    name: 'Profile',
    description: 'View + edit the logged-in user\'s profile. Name/image update immediately; email/phone changes are OTP-verified (request-otp → verify) and apply only when every changed channel is verified. Set {{token}} to a user JWT.',
    endpoints: [
      {
        name: 'Get Profile',
        method: 'GET',
        path: 'api/v1/user/profile',
        description: 'Name, DOB, email, mobile, masked PAN, and a signed profile-image URL. Name/DOB/PAN are one-time onboarding inputs (read-only).'
      },
      {
        name: 'Upload Profile Image',
        method: 'POST',
        path: 'api/v1/user/profile/image',
        description: 'multipart/form-data; field "image" (jpg/png/webp, ≤5MB). Returns a signed URL.',
        formdata: [{ key: 'image', type: 'file' }]
      },
      {
        name: 'Remove Profile Image',
        method: 'DELETE',
        path: 'api/v1/user/profile/image'
      },
      {
        name: 'Request Contact OTP',
        method: 'POST',
        path: 'api/v1/user/profile/contact/request-otp',
        description: 'Send OTP to the new email and/or phone (only the changed field(s)). Leave one out to keep it unchanged.',
        body: { email: 'new@example.com', phone: '9876543210' }
      },
      {
        name: 'Verify Contact OTP',
        method: 'POST',
        path: 'api/v1/user/profile/contact/verify',
        description: 'Applies the change only when every changed channel is verified; if one is unverified, nothing updates.',
        body: { emailOtp: '123456', phoneOtp: '123456' }
      }
    ]
  },

  support: {
    key: 'support',
    name: 'Support & Account',
    description: 'Contact Support (raise + list own requests), Feature Requests ("Suggest Feature"), and Delete Account — common to both B2B and B2C (auth only). Plus the admin triage endpoints. For the user calls set {{token}} to a user JWT; for the admin calls set {{token}} to an admin JWT.',
    endpoints: [
      {
        name: 'Raise Support Request',
        method: 'POST',
        path: 'api/v1/support/queries',
        description: 'Auto-linked to the logged-in user; starts in status "open".',
        body: { name: 'Jane Doe', email: 'jane@example.com', mobile: '9876543210', description: 'I need help with my subscription.' }
      },
      {
        name: 'My Support Requests',
        method: 'GET',
        path: 'api/v1/support/queries',
        description: 'The logged-in user\'s own requests with status + any admin reply.'
      },
      { name: 'Unread Reply Count', method: 'GET', path: 'api/v1/support/unread-count', description: 'Total unread admin replies across the user\'s tickets (for a badge).' },
      { name: 'Ticket Thread', method: 'GET', path: 'api/v1/support/queries/:id', description: 'One ticket with its full message thread.', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Add Reply', method: 'POST', path: 'api/v1/support/queries/:id/messages', pathVars: [{ key: 'id', value: '<queryId>' }], body: { message: 'Any update on this?' } },
      { name: 'Mark Ticket Read', method: 'PATCH', path: 'api/v1/support/queries/:id/read', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Rate Ticket', method: 'POST', path: 'api/v1/support/queries/:id/rating', pathVars: [{ key: 'id', value: '<queryId>' }], body: { rating: 5, feedback: 'Quick help, thanks!' } },
      { name: 'Upload Attachment', method: 'POST', path: 'api/v1/support/queries/:id/attachments', description: 'multipart, field "file".', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Download Attachment', method: 'GET', path: 'api/v1/support/queries/:id/attachments/:attachmentId/download', pathVars: [{ key: 'id', value: '<queryId>' }, { key: 'attachmentId', value: '<attachmentId>' }] },
      { name: 'Delete Attachment', method: 'DELETE', path: 'api/v1/support/queries/:id/attachments/:attachmentId', pathVars: [{ key: 'id', value: '<queryId>' }, { key: 'attachmentId', value: '<attachmentId>' }] },
      {
        name: 'Delete My Account',
        method: 'DELETE',
        path: 'api/v1/user/account',
        description: 'Soft-deletes the account: revokes sessions, cancels subscription, frees phone/email/PAN for re-registration. Retains the record.'
      },
      {
        name: 'Feature Request Options',
        method: 'GET',
        path: 'api/v1/feature-requests/available',
        description: 'The allowed titles for a feature request, with labels + blurbs. Drives the app\'s "Suggest Feature" picker — call this before submitting.'
      },
      {
        name: 'Submit Feature Request',
        method: 'POST',
        path: 'api/v1/feature-requests',
        description: 'App "Suggest Feature" submission. title MUST be a value from /available (gst | itr | roc | tds | bank_statements | mutual_funds | insurance | epf | other) — anything else is rejected with 400. Auto-linked to the logged-in user; starts in status "pending".',
        body: { title: 'other', description: 'Please add a reminder for advance tax instalments.' }
      },
      {
        name: 'Admin — List Feature Requests',
        method: 'GET',
        path: 'api/admin/v1/feature-requests',
        description: 'Admin JWT. All submitted suggestions, newest first, paginated, with the requesting user populated.',
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' }
        ]
      },
      {
        name: 'Admin — Feature Request Options',
        method: 'GET',
        path: 'api/admin/v1/feature-requests/available',
        description: 'Admin JWT. Same catalog as the user-facing /available, used to label stored title values in the console.'
      },
      {
        name: 'Admin — List Support Queries',
        method: 'GET',
        path: 'api/admin/v1/support/queries',
        description: 'Admin JWT. Filter by status + search, paginated.',
        query: [
          { key: 'status', value: 'open' },
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' }
        ]
      },
      {
        name: 'Admin — Get One Query',
        method: 'GET',
        path: 'api/admin/v1/support/queries/:id',
        description: 'Admin JWT. Full ticket: thread, internal notes, attachments, assignment and metadata.',
        pathVars: [{ key: 'id', value: '<queryId>' }]
      },
      { name: 'Admin — Unread Count', method: 'GET', path: 'api/admin/v1/support/unread-count', description: 'Admin JWT. Tickets with unread user messages (badge count).' },
      { name: 'Admin — Support Stats', method: 'GET', path: 'api/admin/v1/support/stats', description: 'Admin JWT. Queue counts by status / age for the support dashboard.' },
      { name: 'Admin — List Assignees', method: 'GET', path: 'api/admin/v1/support/assignees', description: 'Admin JWT. Admins eligible to own a ticket. Requires the support-assign permission.' },
      { name: 'Admin — Add Response', method: 'POST', path: 'api/admin/v1/support/queries/:id/responses', description: 'Admin JWT. Public reply on the ticket thread — visible to the user.', pathVars: [{ key: 'id', value: '<queryId>' }], body: { message: 'Thanks for reaching out — this is now fixed.' } },
      { name: 'Admin — Add Internal Note', method: 'POST', path: 'api/admin/v1/support/queries/:id/internal-notes', description: 'Admin JWT. Staff-only note. NEVER shown to the user.', pathVars: [{ key: 'id', value: '<queryId>' }], body: { note: 'Reproduced on staging.' } },
      { name: 'Admin — Set Assignee', method: 'PATCH', path: 'api/admin/v1/support/queries/:ticketId/assignee', description: 'Admin JWT. Sets the owning admin outright. Requires the support-assign permission.', pathVars: [{ key: 'ticketId', value: '<queryId>' }], body: { assigneeId: '<adminId>' } },
      { name: 'Admin — Update Assignment', method: 'PATCH', path: 'api/admin/v1/support/queries/:id/assignment', description: 'Admin JWT. Richer assignment payload (owner + team/queue) than Set Assignee.', pathVars: [{ key: 'id', value: '<queryId>' }], body: { assigneeId: '<adminId>', team: 'support' } },
      { name: 'Admin — Update Metadata', method: 'PATCH', path: 'api/admin/v1/support/queries/:id/metadata', description: 'Admin JWT. Tags / priority / category.', pathVars: [{ key: 'id', value: '<queryId>' }], body: { priority: 'high', tags: ['billing'] } },
      { name: 'Admin — Mark Read', method: 'PATCH', path: 'api/admin/v1/support/queries/:id/read', description: 'Admin JWT. Clears the unread badge for this ticket.', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Admin — Archive Query', method: 'PATCH', path: 'api/admin/v1/support/queries/:id/archive', description: 'Admin JWT. Archives the ticket (hidden from the default queue).', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Admin — Upload Attachment', method: 'POST', path: 'api/admin/v1/support/queries/:id/attachments', description: 'Admin JWT. multipart/form-data, field name "file".', pathVars: [{ key: 'id', value: '<queryId>' }] },
      { name: 'Admin — Download Attachment', method: 'GET', path: 'api/admin/v1/support/queries/:id/attachments/:attachmentId/download', description: 'Admin JWT. Streams the file back.', pathVars: [{ key: 'id', value: '<queryId>' }, { key: 'attachmentId', value: '<attachmentId>' }] },
      { name: 'Admin — Delete Attachment', method: 'DELETE', path: 'api/admin/v1/support/queries/:id/attachments/:attachmentId', description: 'Admin JWT. Requires support.delete.', pathVars: [{ key: 'id', value: '<queryId>' }, { key: 'attachmentId', value: '<attachmentId>' }] },
      { name: 'Admin — List Response Templates', method: 'GET', path: 'api/admin/v1/support/response-templates', description: 'Admin JWT. Canned replies.' },
      { name: 'Admin — Create Response Template', method: 'POST', path: 'api/admin/v1/support/response-templates', description: 'Admin JWT.', body: { title: 'Refund issued', body: 'Your refund has been processed.' } },
      { name: 'Admin — Get Response Template', method: 'GET', path: 'api/admin/v1/support/response-templates/:templateId', description: 'Admin JWT.', pathVars: [{ key: 'templateId', value: '<templateId>' }] },
      { name: 'Admin — Update Response Template', method: 'PATCH', path: 'api/admin/v1/support/response-templates/:templateId', description: 'Admin JWT.', pathVars: [{ key: 'templateId', value: '<templateId>' }], body: { title: 'Updated title' } },
      { name: 'Admin — Delete Response Template', method: 'DELETE', path: 'api/admin/v1/support/response-templates/:templateId', description: 'Admin JWT. Requires support.delete.', pathVars: [{ key: 'templateId', value: '<templateId>' }] },
      { name: 'Admin — Purge Retention', method: 'POST', path: 'api/admin/v1/support/retention/purge', description: 'DESTRUCTIVE. Admin JWT + support.delete. Applies the data-retention policy and deletes expired tickets.', body: {} },
      {
        name: 'Admin — Update Query Status',
        method: 'PATCH',
        path: 'api/admin/v1/support/queries/:id/status',
        description: 'Admin JWT. status = open|in_progress|resolved|closed; response is an optional reply shown to the user.',
        pathVars: [{ key: 'id', value: '<queryId>' }],
        body: { status: 'in_progress', response: 'We are looking into this.' }
      }
    ]
  },

  tds: {
    key: 'tds',
    name: 'TDS',
    description: 'TRACES certificate jobs (B2B), RESTRUCTURED 2026-09: the family moved to /certificates/:form where :form is 130 (salary TDS, was Form 16) or 131 (other TDS, was Form 16A) — the old submit-job / poll-job / fetch-jobs paths and the form16 / form16a slugs are GONE and 404. THERE IS NO POLLING ROUTE AND NO POLLING CRON: completion arrives on the Sandbox webhook (POST /webhook/sandbox/tds), and POST /jobs/:jobId/refresh is the escape hatch for a missed delivery, not a loop. The body is quarter + tax_year (+ optional profileId) — tax_year is "TY 2025-26" and the server refuses "FY …" rather than spend a credit on a guaranteed provider 400. CONNECT ONCE: save a TdsProfile (see the profile endpoints) and the certificate and potential-notice routes take no credentials at all — the server decrypts them per call from the profile. Also covers "Connect TDS account" (link/read the deductor TAN), TDS "Potential Notices" (async analytics, no TRACES creds), and the TDS Calculator (non-salary + salary/sync synchronous; bulk salary job + poll — no creds, shared B2B + B2C). Set {{token}}.',
    endpoints: [
      {
        name: 'Submit TDS Certificate Job',
        method: 'POST',
        path: 'api/v1/b2b/tds/certificates/:form',
        description: 'Costs 1 TDS credit, refunded automatically when TRACES later fails the job. 202 with a jobId; completion arrives on the webhook. The TRACES login comes from the saved TdsProfile — the credentials and the whole challan block are NOT body fields any more.',
        pathVars: [{ key: 'form', value: '130' }],
        body: { quarter: 'Q1', tax_year: 'TY 2025-26', profileId: '<optional — omit to use your default profile>' }
      },
      {
        name: 'Refresh One TDS Job',
        method: 'POST',
        path: 'api/v1/b2b/tds/jobs/:jobId/refresh',
        description: 'On-demand status read for a job whose webhook was missed. Free at the provider, and NOT a poll loop — the old POST /poll-job/:certificate_type is deleted, credentials and all.',
        pathVars: [{ key: 'jobId', value: '<jobId>' }]
      },
      {
        name: 'Search TDS Jobs (provider history)',
        method: 'POST',
        path: 'api/v1/b2b/tds/certificates/:form/search',
        description: 'Reads the PROVIDER\'s own job list for this deductor rather than ours; free. tan, tax_year and quarter are all required, and `financial_year` and the statement form are not fields on this route.',
        pathVars: [{ key: 'form', value: '130' }],
        body: { tan: 'MUMU12345A', tax_year: 'TY 2025-26', quarter: 'Q1', page_size: 10 }
      },
      {
        name: 'List My TDS Jobs',
        method: 'GET',
        path: 'api/v1/b2b/tds/jobs',
        description: 'Persisted TDS jobs with status + summary (newest first). Low input — the progress tracker / history.',
        query: [
          { key: 'status', value: '', description: 'optional: processing|completed|failed' },
          { key: 'certificate_type', value: '', description: 'optional: 130|131' },
          { key: 'kind', value: '', description: 'optional: certificate|potential_notice — certificates and notice analyses share this collection; "certificate" also matches legacy rows with no kind' }
        ]
      },
      {
        name: 'Get TDS Job Status',
        method: 'GET',
        path: 'api/v1/b2b/tds/jobs/:jobId',
        description: 'One job\'s status + summary (no credentials, no TRACES round-trip). Background-polled by the server.',
        pathVars: [{ key: 'jobId', value: '<jobId>' }]
      },
      {
        name: 'TDS Certificate Links',
        method: 'GET',
        path: 'api/v1/b2b/tds/jobs/:jobId/certificates',
        description: 'Presigned links to the certificate PDFs mirrored into our own storage — plural, which is the route that exists; the old singular /certificate streamed a blob and is deleted. An EMPTY list is the normal answer while TRACES is still preparing the files, not an error.',
        pathVars: [{ key: 'jobId', value: '<jobId>' }]
      },
      {
        name: 'List TDS Profiles',
        method: 'GET',
        path: 'api/v1/b2b/tds/profiles',
        description: 'Saved deductors, default first. Credentials are NEVER returned — each profile reports only hasCredentials: boolean.'
      },
      {
        name: 'Connect TDS Profile',
        method: 'POST',
        path: 'api/v1/b2b/tds/profiles',
        description: '"Connect once": stores the deductor TAN plus an encrypted TRACES username/password. Once a profile exists, the certificate and potential-notice routes take no credentials at all. A NEW TAN counts against the plan\'s per-TAN cap; re-connecting an existing one updates it in place.',
        body: { tan: 'MUMB01234F', tracesUsername: '<traces-user>', tracesPassword: '<traces-password>', label: 'Head office' }
      },
      {
        name: 'Get TDS Profile',
        method: 'GET',
        path: 'api/v1/b2b/tds/profiles/:id',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Update TDS Profile',
        method: 'PATCH',
        path: 'api/v1/b2b/tds/profiles/:id',
        description: 'Partial update — send only what changes. Omitting tracesPassword KEEPS the stored one, so a rename cannot wipe a working login.',
        pathVars: [{ key: 'id', value: '<profileId>' }],
        body: { label: 'Branch office' }
      },
      {
        name: 'Delete TDS Profile',
        method: 'DELETE',
        path: 'api/v1/b2b/tds/profiles/:id',
        description: 'Forgets the stored login only — certificates and analyses already fetched with it are KEPT (use /revoke to delete those too). If it was the default, the next most recent profile is promoted so credential resolution never breaks; with none left, the TAN is cleared from the finance profile.',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Revoke TDS Profile (delete data)',
        method: 'POST',
        path: 'api/v1/b2b/tds/profiles/:id/revoke',
        description: 'DISCONNECT AND ERASE. Deletes the profile AND every TdsJob raised with it — both TRACES certificates and potential-notice analyses, including the raw provider payloads. Matched by profileId or tanHash; revoking the LAST profile also sweeps any job left unattributed and clears the TAN from the finance profile. Irreversible: re-fetching afterwards costs credits. Use DELETE instead to forget only the login. Returns { jobsDeleted, profilesRemaining }.',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Set Default TDS Profile',
        method: 'POST',
        path: 'api/v1/b2b/tds/profiles/:id/default',
        description: 'Exactly one profile per user is the default — it is what an omitted profileId resolves to.',
        pathVars: [{ key: 'id', value: '<profileId>' }]
      },
      {
        name: 'Link TDS TAN (Connect Account)',
        method: 'POST',
        path: 'api/v1/b2b/tds/link-tan',
        description: 'Validate + persist the deductor TAN (no provider verify). Backed by the SAME TdsProfile store as /profiles, so a TAN-only link and a full TRACES login are one record — adding credentials later does not create a second profile. Reused as the default TAN across the certificate + potential-notice flows.',
        body: { tan: 'MUMB01234F' }
      },
      {
        name: 'Get Linked TDS TAN',
        method: 'GET',
        path: 'api/v1/b2b/tds/tan',
        description: 'Returns the deductor TAN linked on the finance profile (low input).'
      },
      {
        name: 'Submit Potential Notice',
        method: 'POST',
        path: 'api/v1/b2b/tds/potential-notices',
        description: 'TDS analytics — "potential notices". Async, no TRACES creds: returns a jobId; the cron polls Sandbox to completion. Costs 1 TDS credit (refunded on failure).',
        body: { tan: 'MUMB01234F', quarter: 'Q1', form: '24Q', financial_year: 'FY 2024-25' }
      },
      {
        name: 'Potential Notice Status',
        method: 'GET',
        path: 'api/v1/b2b/tds/potential-notices',
        description: 'Analysis status + parsed notices for a job (low input — background-polled).',
        query: [{ key: 'job_id', value: '<job_id>' }]
      },
      {
        name: 'Search Potential Notices',
        method: 'POST',
        path: 'api/v1/b2b/tds/potential-notices/search',
        description: 'Sandbox-side search of past potential-notice analyses for this deductor.',
        body: { tan: 'MUMB01234F', quarter: 'Q1', form: '24Q', financial_year: 'FY 2024-25', page_size: 10 }
      },
      {
        name: 'Calculator — Non-Salary TDS',
        method: 'POST',
        path: 'api/v1/b2b/tds/calculator/non-salary',
        description: 'Synchronous TDS on one non-salary payment (no TRACES creds). credit_date is EPOCH ms. Costs 1 TDS credit (refunded on failure). Shared B2B + B2C.',
        body: {
          deductee_type: 'individual',
          is_pan_available: true,
          residential_status: 'resident',
          is_206ab_applicable: false,
          is_pan_operative: true,
          nature_of_payment: 'sales_and_marketing_services',
          credit_amount: 250000,
          credit_date: 1699315200000
        }
      },
      {
        name: 'Calculator — Salary TDS (sync)',
        method: 'POST',
        path: 'api/v1/b2b/tds/calculator/salary/sync',
        description: 'Synchronous TDS on one salary — returns both new- and old-regime figures. financial_year like "FY 2024-25"; salary is a flat {field: value} map. Costs 1 TDS credit (refunded on failure). Shared B2B + B2C.',
        body: {
          financial_year: 'FY 2024-25',
          salary: {
            pan_status: 'PANISVALID',
            employee_category: 'general',
            gross_salary_from_previous_employers: 0,
            tds_by_previous_employers: 0,
            salary_as_per_provisions_contained_in_section_17_1: 750000,
            value_of_perquisites_us_17_2: 0,
            profits_in_lieu_of_salary_us_17_3: 0,
            travel_concession_or_assistance_us_10_5: 0,
            death_cum_retirement_gratuity_us_10_10: 0,
            commuted_value_of_pension_us_10_10_a: 0,
            cash_equivalent_of_leave_salary_encashment_us_10_10_aa: 0,
            house_rent_allowance_us_10_13_a: 0,
            other_special_allowances_under_section_10_14: 0,
            total_amount_of_any_other_exemption_us_10: 0,
            standard_deduction_us_16_ia: 50000,
            entertainment_allowance_us_16_ii: 0,
            tax_on_employment_us_16_iii: 0,
            income_from_house_property_reported_by_employee_offered_for_tds: 346500,
            income_under_the_head_other_sources_offered_for_tds: 0,
            gross_amount_us_80_c: 0,
            deductible_amount_us_80_c: 0,
            gross_amount_us_80_ccc: 0,
            deductible_amount_us_80_ccc: 0,
            gross_amount_us_80_ccd_1: 0,
            deductible_amount_us_80_ccd_1: 0,
            gross_amount_us_80_ccd_1_b: 0,
            deductible_amount_us_80_ccd_1_b: 0,
            gross_amount_us_80_ccd_2: 0,
            deductible_amount_us_80_ccd_2: 0,
            gross_amount_us_80_ccg: 0,
            deductible_amount_us_80_ccg: 0,
            gross_amount_us_80_cch: 0,
            deductible_amount_us_80_cch: 0,
            gross_amount_us_80_d: 0,
            deductible_amount_us_80_d: 0,
            gross_amount_us_80_e: 0,
            deductible_amount_us_80_e: 0,
            gross_amount_us_80_g: 0,
            deductible_amount_us_80_g: 0,
            qualifying_amount_us_80_g: 0,
            gross_amount_us_80_tta: 0,
            deductible_amount_us_80_tta: 0,
            qualifying_amount_us_80_tta: 0,
            gross_amount_for_other_deductions: 0,
            deductible_amount_for_other_deductions: 0,
            qualifying_amount_for_other_deductions: 0
          }
        }
      },
      {
        name: 'Calculator — Salary TDS bulk (submit)',
        method: 'POST',
        path: 'api/v1/b2b/tds/calculator/salary',
        description: 'Submit a bulk salary TDS job — returns a job_id. Same salary body as the sync call; the server uploads the workbook, then poll the job below. Costs 1 TDS credit (refunded on failure).',
        body: {
          financial_year: 'FY 2024-25',
          salary: {
            pan_status: 'PANISVALID',
            employee_category: 'general',
            salary_as_per_provisions_contained_in_section_17_1: 750000,
            standard_deduction_us_16_ia: 50000,
            income_from_house_property_reported_by_employee_offered_for_tds: 346500
          }
        }
      },
      {
        name: 'Calculator — Salary TDS bulk (status)',
        method: 'GET',
        path: 'api/v1/b2b/tds/calculator/salary',
        description: 'Poll a bulk salary TDS job. status: created|queued|succeeded|failed; when succeeded, data.tds_on_salary_workbook_url is the xlsx result. Low input, no charge.',
        query: [{ key: 'job_id', value: '<job_id>' }]
      }
    ]
  },

  digilocker: {
    key: 'digilocker',
    name: 'DigiLocker',
    description: 'DigiLocker KYC — verify, start a consent session, fetch documents. Set {{token}}.',
    endpoints: [
      {
        name: 'OAuth Callback',
        method: 'GET',
        path: 'api/v1/digilocker/callback',
        description: 'PUBLIC OAuth redirect target — DigiLocker/Sandbox sends the BROWSER here. Listed for inspection; the app never calls it directly.',
        query: [{ key: 'code', value: '<oauth-code>' }, { key: 'state', value: '<state>' }]
      },
      {
        name: 'Verify Account',
        method: 'POST',
        path: 'api/v1/digilocker/verify-account',
        body: { aadhaar_number: '123456789012', mobile: '9876543210' }
      },
      {
        name: 'Initiate Session',
        method: 'POST',
        path: 'api/v1/digilocker/sessions/init',
        body: { doc_types: ['aadhaar', 'pan'], redirect_url: 'http://localhost:3000/digilocker', flow: 'signin' }
      },
      {
        name: 'Session Status',
        method: 'GET',
        path: 'api/v1/digilocker/sessions/:session_id/status',
        pathVars: [{ key: 'session_id', value: '<session_id>' }]
      },
      {
        name: 'User Profile',
        method: 'GET',
        path: 'api/v1/digilocker/sessions/:session_id/profile',
        pathVars: [{ key: 'session_id', value: '<session_id>' }]
      },
      {
        name: 'Fetch Document',
        method: 'GET',
        path: 'api/v1/digilocker/sessions/:session_id/documents/:doc_type',
        pathVars: [{ key: 'session_id', value: '<session_id>' }, { key: 'doc_type', value: 'aadhaar' }]
      }
    ]
  },

  payments: {
    key: 'payments',
    name: 'Payments',
    description: 'Razorpay order creation + signature verification, payment history. createOrder STORES what was bought (a PaymentOrder priced from the catalog); verify-payment and the webhook apply that stored order exactly once — the request body never decides what is bought. Delegated sessions: plans / packs / history need billing.read, create-order and verify-payment need billing.purchase (no default non-owner role has it). Set {{token}}.',
    endpoints: [
      {
        name: 'List Active Plans',
        method: 'GET',
        path: 'api/v1/payments/plans',
        description: 'Active catalog plans for the caller\'s workspace. A tier can have many plans — pick a plan _id to subscribe by planId. Each plan carries memberLimit (people incl. the owner; default 1, -1 = unlimited) — a plan below the account\'s seatsUsed cannot be bought.'
      },
      { name: 'List Credit Packs', method: 'GET', path: 'api/v1/payments/credit-packs', description: 'Buyable credit packs; optional ?module= filter.', query: [{ key: 'module', value: '', description: 'gst|roc|tds|itr|investment (optional)' }] },
      {
        name: 'Create Order (plan)',
        method: 'POST',
        path: 'api/v1/payments/create-order',
        description: 'Unknown keys refused (400). purpose defaults to "plan". Prefer planId; planType (individual|business|enterprise) falls back to the cheapest ACTIVE plan of that tier. amount is accepted from the shipped app and IGNORED — the price comes from the catalog. module is only copied into the Razorpay notes. Seat check: a plan whose memberLimit (not -1) is below seatsUsed is refused BEFORE any money moves. 200 { order (Razorpay; amount in paise), planId, planType, amount (₹) }; mock mode returns order.id "order_mock_…" — use THAT id in verify. Errors: 400 (Joi / "planId or planType is required…" / Razorpay failure), 422 PAYMENT_PLAN_UNAVAILABLE, 409 MEMBER_DOWNGRADE_BLOCKED data { memberLimit, seatsUsed }.',
        body: { purpose: 'plan', planId: '<planId>' }
      },
      {
        name: 'Create Order (credits)',
        method: 'POST',
        path: 'api/v1/payments/create-order',
        description: 'Credit top-up: purpose "credits" + packId (required). 200 "Credit order created successfully." { order, purpose, packId, module, credits, amount }. 400 "packId is required to buy credits." / "Credit pack not found or inactive.".',
        body: { purpose: 'credits', packId: '<packId from List Credit Packs>' }
      },
      {
        name: 'Verify Payment & Apply',
        method: 'POST',
        path: 'api/v1/payments/verify-payment',
        description: 'Only razorpay_order_id / razorpay_payment_id / razorpay_signature are needed (Joi unknown(true)). purpose, planId, planType, packId are OPTIONAL and only COMPARED with the stored order — any that differs → 422 PAYMENT_ORDER_MISMATCH data { orderId, fields }; amount is ignored. Flow: HMAC check (mock mode accepts only order_mock_* / pay_mock_* / mock_signature) → load the stored order (the token\'s account must own it; a pre-fix order is rebuilt from Razorpay) → apply once (claim created → processing, waits up to 5 s). 200 "Subscription upgraded successfully." (data = SubscriptionPlan incl. memberLimit) or "This payment has already been applied." on a replay / double tap / webhook-first (nothing extended again); credits: "N GST credits added successfully." { duplicate, module, topupBalance, planAllowed, planUsed, creditsAdded } or "This payment has already been credited.". Errors: 422 (Joi), 400 "Payment verification failed." (signature), 404 PAYMENT_ORDER_NOT_FOUND { orderId }, 409 PAYMENT_ORDER_UNVERIFIABLE { orderId, retryable }, 409 PAYMENT_IN_PROGRESS { orderId } (re-check plan status, do not pay again), 409 PAYMENT_NOT_APPLIED { orderId, paymentId, reasonCode e.g. MEMBER_DOWNGRADE_BLOCKED, details? } (terminal — support refunds or applies), 400 transient apply failure (claim released, retry is safe).',
        body: {
          razorpay_order_id: '<order.id from Create Order, e.g. order_mock_…>',
          razorpay_payment_id: 'pay_mock_123',
          razorpay_signature: 'mock_signature'
        }
      },
      {
        name: 'Payment History',
        method: 'GET',
        path: 'api/v1/payments/history'
      },
      {
        name: 'Transaction Details',
        method: 'GET',
        path: 'api/v1/payments/history/:id',
        description: 'One transaction from the history list.',
        pathVars: [{ key: 'id', value: '<transactionId>' }]
      },
      {
        name: 'Download Invoice',
        method: 'GET',
        path: 'api/v1/payments/history/:id/invoice',
        description: 'That transaction\'s PDF invoice (binary).',
        pathVars: [{ key: 'id', value: '<transactionId>' }]
      }
    ]
  },

  vault: {
    key: 'vault',
    name: 'Cabinet (documents)',
    description:
      'The real document store: nested folders, files at the root, rename, move, Trash, and storage bytes as the ONLY plan limit. ' +
      'Uploads are multipart and answer 202 with status "scanning" — the file is NOT readable until the malware scan and ' +
      'compression finish, so poll GET /files/:id until status is "available". A cross-user id always answers 404, never 403. ' +
      'Over quota is 413 VAULT_STORAGE_LIMIT_EXCEEDED; an expired plan makes the vault read-only with 423 VAULT_READ_ONLY ' +
      '(not 402/403 — the Flutter client owns those globally). Set {{token}}.',
    endpoints: [
      {
        name: 'List Children',
        method: 'GET',
        path: 'api/v1/vault/children',
        description:
          'One listing call: folders and files merged (folders first), breadcrumb included, keyset cursor. ' +
          'Omit folderId for the vault root. Pass the returned nextCursor back as `cursor` for the next page — `skip` does not exist.',
        query: [
          { key: 'folderId', value: '', description: 'omit for the root' },
          { key: 'cursor', value: '', description: 'opaque; from a previous nextCursor' },
          { key: 'limit', value: '50' },
          { key: 'sort', value: 'name', description: 'name | createdAt' },
          { key: 'order', value: 'asc', description: 'asc | desc' }
        ]
      },
      {
        name: 'Storage Usage',
        method: 'GET',
        path: 'api/v1/vault/usage',
        description:
          'Bytes used vs the plan limit, plus overageBytes (usedPercentage saturates at 100, so it cannot tell "exactly full" ' +
          'from "3 GB over") and trashedBytes (trashed files keep costing storage until the purge cron runs).'
      },
      {
        name: 'Search',
        method: 'GET',
        path: 'api/v1/vault/search',
        description:
          'Name-fragment search over folders and files, case-insensitive, Trash excluded. Minimum 2 characters. ' +
          'Regex metacharacters are escaped, so "(1)" matches literally.',
        query: [
          { key: 'q', value: 'gstr' },
          { key: 'limit', value: '50' }
        ]
      },
      {
        name: 'Create Folder',
        method: 'POST',
        path: 'api/v1/vault/folders',
        description: 'parentId null/omitted = the root. A duplicate name here is a 409 — a name the user typed is never silently rewritten.',
        body: { name: 'GST Returns', parentId: null }
      },
      {
        name: 'Rename / Move Folder',
        method: 'PATCH',
        path: 'api/v1/vault/folders/:id',
        description:
          'Rename and move are the same call. Send `name` to rename (409 on collision), send `parentId` to move ' +
          '(auto-suffixes "name (1)" instead of failing — a drag must not fail). Sending parentId:null moves it to the root; ' +
          'OMITTING parentId leaves it where it is. Moving a folder into its own descendant is a 409.',
        pathVars: [{ key: 'id', value: '<folderId>' }],
        body: { name: 'GST Returns 2026-27' }
      },
      {
        name: 'Trash Folder',
        method: 'DELETE',
        path: 'api/v1/vault/folders/:id',
        description: 'Moves the folder AND everything under it to Trash. Reversible until the Trash is emptied or purged. Gate vault.delete. 200 "Folder moved to Trash." { id, folders, files }. Stamps trashedBy/trashedByName/trashedByOwner; a DELEGATED session also sets holdUntil = now + 7 days (not in the response — re-read List Trash), and purgeAt = now + VAULT_TRASH_PURGE_DAYS (default 30).',
        pathVars: [{ key: 'id', value: '<folderId>' }]
      },
      {
        name: 'Upload File (multipart)',
        method: 'POST',
        path: 'api/v1/vault/files',
        description:
          'multipart/form-data: field "file" plus optional "folderId". Answers 202 with status "scanning". ' +
          'PDF, JPG, PNG and XLSX only, validated on MAGIC BYTES (a renamed payload is refused). Max 25MB by default.',
        body: { folderId: '' }
      },
      {
        name: 'Get File (poll)',
        method: 'GET',
        path: 'api/v1/vault/files/:id',
        description: 'Poll after an upload until status leaves scanning/processing. "rejected" carries failureReason.',
        pathVars: [{ key: 'id', value: '<fileId>' }]
      },
      {
        name: 'Rename / Move File',
        method: 'PATCH',
        path: 'api/v1/vault/files/:id',
        description: 'Same semantics as the folder version: `name` renames (409 on collision), `folderId` moves (auto-suffixes).',
        pathVars: [{ key: 'id', value: '<fileId>' }],
        body: { name: 'Form 16 FY2026-27.pdf' }
      },
      {
        name: 'Trash File',
        method: 'DELETE',
        path: 'api/v1/vault/files/:id',
        description: 'Gate vault.delete. 200 "File moved to Trash." { id }. Same stamps as Trash Folder: owner → no hold; delegated session → holdUntil = now + 7 days.',
        pathVars: [{ key: 'id', value: '<fileId>' }]
      },
      {
        name: 'Download File',
        method: 'GET',
        path: 'api/v1/vault/files/:id/download',
        description:
          'Mints a 60-second presigned URL forcing Content-Disposition: attachment. The URL IS the credential — do not paste it anywhere. ' +
          'A file that is not yet "available" answers 409 VAULT_FILE_NOT_READY.',
        pathVars: [{ key: 'id', value: '<fileId>' }]
      },
      {
        name: 'Bulk Move / Trash',
        method: 'POST',
        path: 'api/v1/vault/bulk',
        description:
          'Up to 200 ids per call. action "trash" or "move" (move needs destinationId; null = root). ' +
          'Ids that are not yours are SKIPPED, not rejected — the response counts what actually changed. ' +
          'Delegated sessions: vault.upload at the gate, PLUS vault.delete in the controller when action is "trash" (403 MEMBER_PERMISSION_DENIED).',
        body: { action: 'trash', fileIds: [], folderIds: [] }
      },
      {
        name: 'List Trash',
        method: 'GET',
        path: 'api/v1/vault/trash',
        description:
          'Gate vault.read. Trash roots only, newest first, at most 200 folders + 200 files, no paging: { folders[], files[], trashedBytes }. ' +
          'Every item carries trashedAt, purgeAt, trashedByName, trashedByOwner (both null on rows trashed before co-users) and holdUntil. ' +
          'HELD = holdUntil != null && holdUntil > now: nobody, the owner included, can permanently delete it until then (a director\'s trash is held 7 days; owner trashes are never held). ' +
          'Files also carry uploadedByName, folders createdByName. The body has no server time — read the HTTP Date header and pass it as listedAt to Empty Trash.'
      },
      {
        name: 'Restore from Trash',
        method: 'POST',
        path: 'api/v1/vault/trash/:type/:id/restore',
        description:
          'Gate vault.delete. Restores exactly that deletion. A folder brings back what went down WITH it, not things trashed separately. ' +
          'Returns to its parent (or the root if the parent is itself trashed); a name clash auto-suffixes "name (1)". Clears the hold. ' +
          'Errors: 404 VAULT_FILE_NOT_FOUND / VAULT_FOLDER_NOT_FOUND (not a trash root), 409 VAULT_PURGE_IN_PROGRESS (within 5 minutes of purgeAt or being purged), 409 VAULT_NAME_TAKEN, 423 VAULT_READ_ONLY, 429.',
        pathVars: [{ key: 'type', value: 'file' }, { key: 'id', value: '<id>' }]
      },
      {
        name: 'Empty Trash',
        method: 'DELETE',
        path: 'api/v1/vault/trash',
        description:
          'OWNER SESSION ONLY (gate OWNER_ONLY + requireOwnerSession → 403 MEMBER_OWNER_ONLY when delegated). Unknown query keys refused (400). ' +
          'Marks every UNHELD trashed row for purge and purges up to 200 inline (the 03:15 cron takes the rest); held rows are untouched. ' +
          'listedAt (optional ISO, add ?listedAt=<the Date header of the List Trash call>): only items with trashedAt <= listedAt are taken, so something trashed after the owner loaded the list is never deleted. An EMPTY listedAt is refused with 400, so send it only with a value. ' +
          '200 { markedForPurge, deleted, remaining, releasedBytes, held (trash roots still held), heldUntil (earliest hold end | null) }; the message adds "H item(s) deleted by others are protected until <date>." when held > 0.'
      },
      // ── Cabinet lock: per PERSON (each director has their own PIN / lock on the company Cabinet) ──
      {
        name: 'Lock Status',
        method: 'GET',
        path: 'api/v1/vault/lock',
        description: 'Any member. The caller\'s own lock on this Cabinet. 200 "Lock status fetched.".'
      },
      {
        name: 'Set / Change Lock',
        method: 'POST',
        path: 'api/v1/vault/lock',
        description: 'Any member. mode device|pin; pin (4 or 6 digits) is required for "pin" and forbidden for "device"; currentPin to change an existing PIN; autoLockMinutes 0-60. Write limiter. 200 "Cabinet lock updated.".',
        body: { mode: 'pin', pin: '482913', autoLockMinutes: 2 }
      },
      {
        name: 'Verify PIN (unlock)',
        method: 'POST',
        path: 'api/v1/vault/lock/verify',
        description: 'Any member. Write limiter. 200 "Unlocked.".',
        body: { pin: '482913' }
      },
      {
        name: 'Remove Lock',
        method: 'DELETE',
        path: 'api/v1/vault/lock',
        description: 'Any member. Optional body { pin }. Write limiter. 200 "Cabinet lock removed.".',
        body: { pin: '482913' }
      },
      {
        name: 'Request Lock Reset (OTP)',
        method: 'POST',
        path: 'api/v1/vault/lock/reset/request',
        description: 'Any member. Texts a code to the CALLER\'s registered mobile — for a delegated session that is the director\'s mobile, not the company\'s. Reset limiter. 200 "We sent a code to your registered mobile.".'
      },
      {
        name: 'Reset Lock',
        method: 'POST',
        path: 'api/v1/vault/lock/reset',
        description: 'Any member. otp = 4-6 digits from Request Lock Reset. Reset limiter. 200 "Cabinet lock reset. Set a new one to protect it.".',
        body: { otp: '123456' }
      }
    ]
  },

  storage: {
    key: 'storage',
    name: 'Documents (Storage) \u2014 RETIRED',
    description:
      'RETIRED \u2014 use the Vault group above. This API never stored a byte: the server wrote the literal string '
      + '"Mock content for <name>" to local disk and the app stripped the file bytes before sending. '
      + 'Reads still answer so the shipped v1.0.3+4 build does not crash; POST /upload-file now returns 410 Gone.',
    endpoints: [
      { name: 'Get Storage Info', method: 'GET', path: 'api/v1/storage/info' },
      { name: 'Get Storage Usage', method: 'GET', path: 'api/v1/storage/usage' },
      { name: 'Create Folder', method: 'POST', path: 'api/v1/storage/create-folder', body: { name: 'ITR Documents' } },
      {
        name: 'Upload File (metadata)',
        method: 'POST',
        path: 'api/v1/storage/upload-file',
        body: { folderId: '<folderId>', name: 'document.pdf', size: 1048576, mimeType: 'application/pdf' }
      },
      {
        name: 'List Files',
        method: 'GET',
        path: 'api/v1/storage/list-files',
        query: [
          { key: 'folderId', value: '', description: 'optional' },
          { key: 'page', value: '1' },
          { key: 'pageSize', value: '10' }
        ]
      },
      { name: 'Delete File', method: 'DELETE', path: 'api/v1/storage/delete-file/:fileId', pathVars: [{ key: 'fileId', value: '<fileId>' }] },
      { name: 'Delete Folder', method: 'DELETE', path: 'api/v1/storage/delete-folder/:folderId', pathVars: [{ key: 'folderId', value: '<folderId>' }] }
    ]
  },

  admin: {
    key: 'admin',
    name: 'Admin Panel',
    description: 'Admin auth + admin-user management + Super-Admin plan catalog. Uses the /api/admin/v1 prefix; set {{token}} to an ADMIN JWT.',
    endpoints: [
      { name: 'Admin Register', method: 'POST', path: 'api/admin/v1/auth/register', body: { email: 'admin@foldy.in', password: '<password>', fullName: 'Admin User' } },
      { name: 'Admin Login', method: 'POST', path: 'api/admin/v1/auth/login', body: { email: 'admin@foldy.in', password: '<password>' } },
      {
        name: 'Admin Forgot Password',
        method: 'POST',
        path: 'api/admin/v1/auth/forgot-password',
        description: 'Emails a 6-digit OTP to begin a password reset.',
        body: { email: 'admin@foldy.in' }
      },
      {
        name: 'Admin Verify Email OTP',
        method: 'POST',
        path: 'api/admin/v1/auth/verify-email-otp',
        description: 'Verifies the 6-digit reset OTP.',
        body: { email: 'admin@foldy.in', otp: '123456' }
      },
      {
        name: 'Admin Update Password',
        method: 'POST',
        path: 'api/admin/v1/auth/update-password',
        description: 'Sets a new password (≥ 6 chars) using the verified OTP.',
        body: { email: 'admin@foldy.in', otp: '123456', newPassword: '<new-password>' }
      },
      {
        name: 'Admin Logout',
        method: 'POST',
        path: 'api/admin/v1/auth/logout',
        description: 'Revokes the current admin JWT (token denylist). Requires an admin {{token}}.'
      },
      {
        name: 'List Admin Users',
        method: 'GET',
        path: 'api/admin/v1/admin-users',
        query: [{ key: 'page', value: '1' }, { key: 'limit', value: '10' }, { key: 'search', value: '', description: 'optional' }]
      },
      {
        name: 'List Plans',
        method: 'GET',
        path: 'api/admin/v1/plans',
        description: 'Subscription plan catalog (active + inactive). Requires plans.read. Each plan includes memberLimit.'
      },
      {
        name: 'Create Plan',
        method: 'POST',
        path: 'api/admin/v1/plans',
        description: 'Requires plans.create. Multiple plans allowed per tier (planType). workspace (business|individual) is REQUIRED. price is in ₹; storageLimit in bytes; interval = monthly|quarterly|annual|none. memberLimit = people who may hold the account, OWNER INCLUDED: integer, -1 = unlimited, 0 refused, defaults to 1 ("memberLimit must be -1 (unlimited) or at least 1."). Unknown keys stripped; validation errors are 400 with no errorCode.',
        body: {
          planType: 'business',
          workspace: 'business',
          name: 'Business Monthly',
          description: 'For growing companies.',
          price: 4999,
          currency: 'INR',
          interval: 'monthly',
          storageLimit: 21474836480,
          memberLimit: 5,
          allowedCredits: { gst: 100, roc: 10, tds: 20, itr: 10, investment: 10 },
          isActive: true
        }
      },
      {
        name: 'Update Plan',
        method: 'PUT',
        path: 'api/admin/v1/plans/:id',
        description: 'Requires plans.update. Edit price/quotas/details — at least one field ("Provide at least one field to update."); unknown plan id → 400 "Plan not found.". Bumps version; does NOT affect active subscribers: a memberLimit change reaches a customer only when they next buy or renew (the subscription snapshots it at purchase; backfill:member-limits only fills subscriptions with no memberLimit).',
        pathVars: [{ key: 'id', value: '<planId>' }],
        body: { price: 499, name: 'Individual', memberLimit: 1 }
      },
      {
        name: 'Activate / Deactivate Plan',
        method: 'PATCH',
        path: 'api/admin/v1/plans/:id/status',
        pathVars: [{ key: 'id', value: '<planId>' }],
        body: { isActive: false }
      },
      {
        name: 'Statistics Overview',
        method: 'GET',
        path: 'api/admin/v1/stats/overview',
        description: 'Users + subscriptions + revenue + compliance. Live from MongoDB.',
        query: [
          { key: 'activeDays', value: '30', description: 'active-user window (default 30)' },
          { key: 'trendMonths', value: '6', description: 'revenue trend length (default 6)' }
        ]
      },
      {
        name: 'Revenue & Trend',
        method: 'GET',
        path: 'api/admin/v1/stats/revenue',
        description: 'Revenue: gross/refunded/net, by module, last 30 days + monthly trend.',
        query: [{ key: 'trendMonths', value: '6', description: 'default 6' }]
      },
      {
        name: 'List App Users',
        method: 'GET',
        path: 'api/admin/v1/users',
        description: 'App users with block status + subscription summary.',
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '10' },
          { key: 'search', value: '', description: 'phone / email / name (optional)' }
        ]
      },
      {
        name: 'Get User Details',
        method: 'GET',
        path: 'api/admin/v1/users/:userId',
        description: 'Full per-user view: profile, subscription/plan, storage usage (used/available), and recent payments.',
        pathVars: [{ key: 'userId', value: '<userId>' }]
      },
      {
        name: 'Block User',
        method: 'PATCH',
        path: 'api/admin/v1/users/:userId/block',
        description: 'Blocks app access. Audit-logged.',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { reason: 'Fraudulent activity' }
      },
      {
        name: 'Unblock User',
        method: 'PATCH',
        path: 'api/admin/v1/users/:userId/unblock',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { reason: 'Resolved' }
      },
      {
        name: 'Update User Module Access',
        method: 'PATCH',
        path: 'api/admin/v1/users/:userId/modules',
        description: 'Toggle per-user module access. Send any subset — omitted flags are left unchanged. A missing flag means ENABLED for that user. Audit-logged; busts the user cache.',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { gst: false, roc: false, tds: true, itr: true, investment: true }
      },
      {
        name: 'User Team (staff)',
        method: 'GET',
        path: 'api/admin/v1/users/:userId/team',
        description: 'Requires users.team.read. Pure read, served from the identity model (Membership / Person / TenantRole / Tenant) through the legacy user row\'s tenant; a legacy row without one reads as an empty team. { membersEnabled, workspace, memberLimit (the limit that applies now, -1 unlimited), seatsUsed (§7.10\'s formula evaluated, never a recount), memberships: [{ id (membership id), person: { id, name | null, contact: { mobile, email } (both MASKED, same helpers as the app; email is their own address once set, else the work address the admin typed) }, role: { id, name | null, isSystem, systemKey?, seatConsuming }, status: active | suspended, isOwner, title | null, addedAt, joinedAt, lastActiveAt, suspendedAt, setupPending (no password chosen yet) }] (owner first, then oldest), memberOf: [{ id, tenant: { id, name, kind }, role, status, joinedAt, lastActiveAt }] }. There is NO `invited` status and no `invites` array (decision R21): a pre-R21 row reads as active with setupPending. memberLimit counts SEAT-CONSUMING ROLES, not people (§6.1 L3, §7.10). No full mobile, full email, password hash or PAN is ever included. 422 VALIDATION_FAILED "That id is not valid.", 404 NOT_FOUND "User not found.".',
        pathVars: [{ key: 'userId', value: '<userId>' }]
      },
      {
        name: 'Force-Revoke Team Member',
        method: 'DELETE',
        path: 'api/admin/v1/users/:userId/team/members/:membershipId',
        description: 'Requires users.team.revoke. Runs the owner\'s own removal path (staffActionService.removeMember, acting AS the owner with the alert-shrink warning pre-acknowledged): the membership is hard-deleted, that workspace\'s sessions end, any contact-change proposal is voided, the seat is recounted and the person and the owner are told. Optional body { reason ≤ 500 } recorded only in the admin audit trail; the customer\'s Activity log names "Foldy support". 200 "Access revoked. Their sessions have been ended." { membershipId, person: { id, name }, status: "removed", role: { id, name }, seats: { used, limit }, alertsEmptied[] }. Errors: 422 VALIDATION_FAILED, 404 NOT_FOUND ("User not found." or "That person is not in this workspace."), 403 RBAC_PERMISSION_DENIED { reason: "owner_membership" } for the owner row, 403 TEAM_UNAVAILABLE (individual workspace, or no owner membership). Support can never add, re-role or reactivate anyone.',
        pathVars: [{ key: 'userId', value: '<userId>' }, { key: 'membershipId', value: '<memberships[].id>' }],
        body: { reason: 'Customer asked support to remove a former director.' }
      },
      /*
       * GONE, NOT MISSING — `DELETE /users/:userId/team/invites/:inviteId`.
       * `adminTeamRoutes` mounts only `GET /:userId/team` and
       * `DELETE /:userId/team/members/:membershipId`. There is no invitation to
       * cancel and no `invited` membership (decision R21).
       */
      {
        name: 'Cancel Subscription',
        method: 'POST',
        path: 'api/admin/v1/users/:userId/cancel-subscription',
        description: 'Cancels the user subscription. reason is REQUIRED. Audit-logged.',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { reason: 'Customer requested cancellation' }
      },
      {
        name: 'Process Refund',
        method: 'POST',
        path: 'api/admin/v1/payments/:paymentId/refund',
        description: 'Razorpay refund. Omit amount for full; include ₹ amount for partial. Audit-logged.',
        pathVars: [{ key: 'paymentId', value: '<razorpayPaymentId>' }],
        body: { amount: 499, reason: 'Service issue' }
      },
      {
        name: 'Audit Logs',
        method: 'GET',
        path: 'api/admin/v1/audit-logs',
        description: 'Management action trail (newest first).',
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' },
          { key: 'action', value: '', description: 'block_user|unblock_user|cancel_subscription|refund_payment (optional)' }
        ]
      },
      {
        name: 'Broadcast Notification',
        method: 'POST',
        path: 'api/admin/v1/notifications/broadcast',
        description: 'Push to every subscribed device via OneSignal, or to a filtered audience. Recorded in notification history. Omit "filters" entirely to reach everyone (original behaviour). With filters, the server resolves matching user ids and targets those instead.',
        body: { title: 'Scheduled maintenance', message: 'Foldy will be briefly unavailable tonight at 11 PM IST.' }
      },
      {
        name: 'Broadcast to a Targeted Audience',
        method: 'POST',
        path: 'api/admin/v1/notifications/broadcast',
        description: 'Same endpoint, with audience targeting. Filters combine with AND: planTypes (trial|business|individual|enterprise), joinedDaysAgo (signed up EXACTLY N days ago, 0 = today), expiredOnly (subscription expired), workspace (business|individual). Blocked and deleted accounts are always excluded. Errors 400 if no user matches.',
        body: {
          title: 'Your plan has expired',
          message: 'Renew now to keep access to your documents.',
          filters: { planTypes: ['business'], expiredOnly: true }
        }
      },
      {
        name: 'Preview Broadcast Audience',
        method: 'POST',
        path: 'api/admin/v1/notifications/broadcast/preview',
        description: 'Returns { count, summary } — how many users match these filters. Sends nothing. A broadcast cannot be recalled, so check this before sending. An empty filters object counts all eligible users.',
        body: { filters: { planTypes: ['trial'], joinedDaysAgo: 30 } }
      },
      {
        name: 'Send Notification to User',
        method: 'POST',
        path: 'api/admin/v1/notifications/users/:userId',
        description: 'Push to one app user (targets external id = userId, falls back to stored device token).',
        pathVars: [{ key: 'userId', value: '<userId>' }],
        body: { title: 'Your GST return is due', message: 'GSTR-1 for 06-2026 is due in 3 days.' }
      },
      {
        name: 'Notification History',
        method: 'GET',
        path: 'api/admin/v1/notifications',
        description: 'Paginated history of sent notifications (newest first).',
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' },
          { key: 'audience', value: '', description: 'broadcast|user (optional)' }
        ]
      },
      { name: 'List Features', method: 'GET', path: 'api/admin/v1/features', description: 'Feature flags with status (operational | disabled-manual | api-error-auto) + killSwitch — the error-provider kill-switch registry.' },
      { name: 'Create Feature', method: 'POST', path: 'api/admin/v1/features', description: 'redisKey is what the kill-switch middleware reads.', body: { title: 'Whitebooks GST', apiProvider: 'whitebooks', redisKey: 'killswitch:provider:whitebooks-gst', status: 'operational', killSwitch: true, description: '' } },
      { name: 'Toggle Feature (kill-switch)', method: 'PATCH', path: 'api/admin/v1/features/:id/toggle', description: 'REQUIRES a killSwitch body; optionally a status.', pathVars: [{ key: 'id', value: '<featureId>' }], body: { killSwitch: false, status: 'disabled-manual' } },
      { name: 'Update Feature', method: 'PUT', path: 'api/admin/v1/features/:id', pathVars: [{ key: 'id', value: '<featureId>' }], body: { status: 'operational', killSwitch: true } },
      { name: 'Delete Feature', method: 'DELETE', path: 'api/admin/v1/features/:id', pathVars: [{ key: 'id', value: '<featureId>' }] },
      { name: 'List Calendar Events', method: 'GET', path: 'api/admin/v1/calendar', description: 'All events; optional ?month=YYYY-MM.', query: [{ key: 'month', value: '', description: 'YYYY-MM (optional)' }] },
      { name: 'Create Calendar Event', method: 'POST', path: 'api/admin/v1/calendar', body: { title: 'GSTR-1 due', date: '2026-07-11', timeStart: '09:00', timeEnd: '10:00', status: 'pending', eventType: 'compliance' } },
      { name: 'Update Calendar Event', method: 'PUT', path: 'api/admin/v1/calendar/:id', pathVars: [{ key: 'id', value: '<eventId>' }], body: { status: 'approval' } },
      { name: 'Delete Calendar Event', method: 'DELETE', path: 'api/admin/v1/calendar/:id', pathVars: [{ key: 'id', value: '<eventId>' }] },
      { name: 'Bulk Create Calendar Events', method: 'POST', path: 'api/admin/v1/calendar/bulk', body: { events: [{ title: 'GSTR-3B due', date: '2026-07-20' }] } },
      { name: 'Import Previous Year', method: 'POST', path: 'api/admin/v1/calendar/import-previous-year', body: { targetMonth: '2026-07' } },
      { name: 'Credit Costs', method: 'GET', path: 'api/admin/v1/credits/costs', description: 'Per-module credit costs (refresh / download) and their freshness windows.' },
      { name: 'Update Credit Costs', method: 'PUT', path: 'api/admin/v1/credits/costs', description: 'Upserts ONE module+action rule. freshnessMinutes: a repeat refresh inside the window is served free (omit for the module default — GST 360, others 1440; 0 = always refetch).', body: { module: 'gst', action: 'refresh', creditCost: 1, freshnessMinutes: 360, description: '' } },
      { name: 'List Credit Packs (admin)', method: 'GET', path: 'api/admin/v1/credits/packs' },
      { name: 'Create Credit Pack', method: 'POST', path: 'api/admin/v1/credits/packs', body: { name: 'Starter', credits: 100, price: 499, module: 'gst' } },
      { name: 'Update Credit Pack', method: 'PUT', path: 'api/admin/v1/credits/packs/:id', pathVars: [{ key: 'id', value: '<packId>' }], body: { price: 599 } },
      { name: 'User Credits', method: 'GET', path: 'api/admin/v1/credits/users/:userId', description: 'A single user two-bucket wallet, one row per module.', pathVars: [{ key: 'userId', value: '<userId>' }] },
      { name: 'User Credit Ledger', method: 'GET', path: 'api/admin/v1/credits/users/:userId/ledger', description: 'Why that balance is what it is — newest first.', pathVars: [{ key: 'userId', value: '<userId>' }], query: [{ key: 'module', value: '' }, { key: 'limit', value: '50' }] },
      { name: 'Adjust User Credits', method: 'PATCH', path: 'api/admin/v1/credits/users/:userId', description: 'Adjust ONE module. planAllowed/topupBalance set absolute values; delta nudges a bucket (top-up unless bucket says otherwise — top-up survives the next cycle reset). Ledgered as admin_adjust against the acting admin.', pathVars: [{ key: 'userId', value: '<userId>' }], body: { module: 'gst', delta: 50, bucket: 'topup', note: 'Comped after a failed refresh' } },
      // --- Report engine (universal builder). A report is a saved DEFINITION run by the safe, registry-whitelisted engine. Legacy module/reportView reports still supported. ---
      { name: 'Report Data Sources', method: 'GET', path: 'api/admin/v1/reports/data-sources', description: 'Catalog of reportable data sources + their fields/operators (drives the builder AND acts as the query whitelist).' },
      { name: 'Preview Report', method: 'POST', path: 'api/admin/v1/reports/preview', description: 'Run a report DEFINITION live — registry-whitelisted, row/time-capped, Redis-cached 120s. userScopeId scopes the whole report to one user.', body: { definition: { dataSource: 'payments', visualization: 'bar', groupBy: { field: 'module' }, metrics: [{ key: 'm1', label: 'Revenue', agg: 'sum', field: 'amount' }] }, page: 1, noCache: false } },
      { name: 'Export Report CSV', method: 'POST', path: 'api/admin/v1/reports/export', description: 'Cursor-streams matching rows as CSV (cap 50k rows). Body mirrors Preview.', body: { definition: { dataSource: 'users', visualization: 'table', columns: ['fullName', 'email', 'createdAt'] } } },
      { name: 'Create Report', method: 'POST', path: 'api/admin/v1/reports', description: 'Engine: { reportName, definition, published?, userScoped? }. Legacy: { reportName, module, reportView }.', body: { reportName: 'Revenue by module', definition: { dataSource: 'payments', visualization: 'pie', groupBy: { field: 'module' }, metrics: [{ key: 'm1', label: 'Revenue', agg: 'sum', field: 'amount' }] }, published: true, userScoped: false } },
      { name: 'List Reports', method: 'GET', path: 'api/admin/v1/reports', description: 'Saved reports (paged).', query: [{ key: 'search', value: '', description: 'name/description' }, { key: 'module', value: '', description: 'legacy filter' }, { key: 'page', value: '1' }, { key: 'limit', value: '20' }] },
      { name: 'Reports Dashboard (legacy stats)', method: 'GET', path: 'api/admin/v1/reports/dashboard' },
      { name: 'Published Reports', method: 'GET', path: 'api/admin/v1/reports/published', description: 'Every published report + its cached result — the dashboard widget feed.' },
      { name: 'Get Report', method: 'GET', path: 'api/admin/v1/reports/:reportId', description: 'One report + its definition, WITHOUT running it — powers builder edit mode.', pathVars: [{ key: 'reportId', value: '<reportId>' }] },
      { name: 'Report Data', method: 'GET', path: 'api/admin/v1/reports/:reportId/data', description: 'Run a saved report. userScopeId scopes to one user (user-detail analytics).', pathVars: [{ key: 'reportId', value: '<reportId>' }], query: [{ key: 'userScopeId', value: '', description: 'optional user id' }, { key: 'page', value: '1' }, { key: 'noCache', value: 'false' }] },
      { name: 'Update Report', method: 'PATCH', path: 'api/admin/v1/reports/:reportId', description: 'Partial update: reportName / description / definition / published / userScoped.', pathVars: [{ key: 'reportId', value: '<reportId>' }], body: { published: true } },
      { name: 'Delete Report', method: 'DELETE', path: 'api/admin/v1/reports/:reportId', pathVars: [{ key: 'reportId', value: '<reportId>' }] },
      { name: 'Create Saved Search', method: 'POST', path: 'api/admin/v1/saved-searches', body: { name: 'Expiring trials', query: {} } },
      { name: 'List Saved Searches', method: 'GET', path: 'api/admin/v1/saved-searches' },
      { name: 'Get Saved Search', method: 'GET', path: 'api/admin/v1/saved-searches/:savedSearchId', pathVars: [{ key: 'savedSearchId', value: '<id>' }] },
      { name: 'Update Saved Search', method: 'PATCH', path: 'api/admin/v1/saved-searches/:savedSearchId', pathVars: [{ key: 'savedSearchId', value: '<id>' }], body: { name: 'Renamed' } },
      { name: 'Delete Saved Search', method: 'DELETE', path: 'api/admin/v1/saved-searches/:savedSearchId', pathVars: [{ key: 'savedSearchId', value: '<id>' }] },
      { name: 'Execute Saved Search', method: 'POST', path: 'api/admin/v1/saved-searches/:savedSearchId/execute', pathVars: [{ key: 'savedSearchId', value: '<id>' }] },
      { name: 'Cron Status', method: 'GET', path: 'api/admin/v1/crons/status' },
      { name: 'Cron Runs', method: 'GET', path: 'api/admin/v1/crons/runs' },
      { name: 'Cron Run Detail', method: 'GET', path: 'api/admin/v1/crons/runs/:id', pathVars: [{ key: 'id', value: '<runId>' }] },
      { name: 'Run Cron Now', method: 'POST', path: 'api/admin/v1/crons/:name/run', pathVars: [{ key: 'name', value: 'complianceStatsCron' }] },
      { name: 'Search Users', method: 'POST', path: 'api/admin/v1/users/search', body: { query: '', filters: {} } },
      { name: 'Create Admin User', method: 'POST', path: 'api/admin/v1/admin-users', body: { email: 'admin@foldy.co.in', password: '<password>', fullName: 'New Admin', role: 'admin' } },
      { name: 'Get Admin User', method: 'GET', path: 'api/admin/v1/admin-users/:id', pathVars: [{ key: 'id', value: '<adminId>' }] },
      { name: 'Update Admin User', method: 'PATCH', path: 'api/admin/v1/admin-users/:id', pathVars: [{ key: 'id', value: '<adminId>' }], body: { fullName: 'Updated' } },
      { name: 'Set Admin Role', method: 'PATCH', path: 'api/admin/v1/admin-users/:id/role', pathVars: [{ key: 'id', value: '<adminId>' }], body: { role: 'superadmin' } },
      { name: 'Admin Session (me)', method: 'GET', path: 'api/admin/v1/auth/me', description: 'The signed-in admin: identity, role and resolved permissions.' },
      { name: 'Change Password', method: 'POST', path: 'api/admin/v1/auth/change-password', description: 'Signed-in password change — distinct from the OTP forgot-password flow.', body: { currentPassword: '<current>', newPassword: '<new>' } },
      { name: 'List Roles', method: 'GET', path: 'api/admin/v1/roles', description: 'Requires roles.read.' },
      { name: 'Role Options', method: 'GET', path: 'api/admin/v1/roles/options', description: 'Permission + module catalog for the role editor. Auth only — no roles.* permission needed, unlike the rest of this group.' },
      { name: 'Create Role', method: 'POST', path: 'api/admin/v1/roles', description: 'Requires roles.create.', body: { name: 'Support Agent', permissions: ['support.read', 'support.update'] } },
      { name: 'Get Role', method: 'GET', path: 'api/admin/v1/roles/:id', description: 'Requires roles.read.', pathVars: [{ key: 'id', value: '<roleId>' }] },
      { name: 'Update Role', method: 'PATCH', path: 'api/admin/v1/roles/:id', description: 'Requires roles.update.', pathVars: [{ key: 'id', value: '<roleId>' }], body: { name: 'Senior Support Agent' } },
      { name: 'Delete Role', method: 'DELETE', path: 'api/admin/v1/roles/:id', description: 'Requires roles.delete.', pathVars: [{ key: 'id', value: '<roleId>' }] },
      { name: 'Get Role Module Access', method: 'GET', path: 'api/admin/v1/roles/:id/module-access', description: 'Per-module access for the role. Separate sub-resource so it can be edited without rewriting the role.', pathVars: [{ key: 'id', value: '<roleId>' }] },
      { name: 'Update Role Module Access', method: 'PATCH', path: 'api/admin/v1/roles/:id/module-access', description: 'Requires roles.update.', pathVars: [{ key: 'id', value: '<roleId>' }], body: { gst: true, roc: false, tds: true, itr: true } },
      { name: 'Import Calendar Sheet', method: 'POST', path: 'api/admin/v1/calendar/import', description: 'Whole-year event upload (.xlsx/.csv), all-or-nothing validation. multipart field "file"; ?dryRun=true validates without writing.', query: [{ key: 'dryRun', value: 'true' }] },
      { name: 'Calendar Import Template', method: 'GET', path: 'api/admin/v1/calendar/import/template', description: 'Downloads the sample sheet for the importer.' },
      { name: 'Upload Compliance Calendar', method: 'POST', path: 'api/admin/v1/calendar/upload-compliance', description: 'Compliance-specific sheet upload — distinct from Import Calendar Sheet. multipart field "file".' },
      { name: 'Delete Admin User', method: 'DELETE', path: 'api/admin/v1/admin-users/:id', pathVars: [{ key: 'id', value: '<adminId>' }] }
    ]
  },
  chat: {
    key: 'chat',
    name: 'Chat',
    description:
      'Chat session tokens — common to both B2B and B2C (auth only, no segment gate). The privileged CometChat REST key stays server-side; this mints a short-lived token scoped to the logged-in user. The chat uid is taken from the JWT, so there is nothing to pass in the body. Set {{token}} to a user JWT.',
    endpoints: [
      {
        name: 'Create Chat Session',
        method: 'POST',
        path: 'api/v1/chat/session',
        description:
          'Returns { uid, authToken, appId, region }. Creates the remote chat user on first call, so it is safe to call on every login. 503 if chat is not configured on the server.',
        body: {}
      }
    ]
  },

  calendar: {
    key: 'calendar',
    name: 'Calendar',
    description: 'Compliance / events calendar the user reads. Admins curate the entries via the Admin Panel section (calendar CRUD). Set {{token}} to a user JWT.',
    endpoints: [
      { name: 'Get Calendar Events', method: 'GET', path: 'api/v1/calendar', description: 'All events (compliance + general), sorted by date then start time.' }
    ]
  },
  moneyone: {
    key: 'moneyone',
    name: 'Investment (Account Aggregator)',
    description:
      'MoneyOne / OneMoney Account Aggregator — shared by B2C + B2B (gated by the `investment` module entitlement, not the path; the /b2c prefix is legacy). Flow: create a consent, send the user to webRedirectionUrl to approve at the AA, resolve the consentHandle into a consentId, then fetch data. Replace :template with mf-sip | equity | banking. Set {{token}} to a user JWT.',
    endpoints: [
      {
        name: 'List Product Templates',
        method: 'GET',
        path: 'api/v1/moneyone/templates',
        description: 'The AA product templates this server exposes.'
      },
      {
        name: 'Create Consent',
        method: 'POST',
        path: 'api/v1/moneyone/banking/consent',
        description:
          'Returns { webRedirectionUrl, consentHandle, token }. The server persists a PENDING consent and sets the redirect to its own public callback carrying an unguessable token. Send the user to webRedirectionUrl; after they approve/decline, OneMoney redirects to the callback, which verifies the real status and deep-links back into the app. pan / fipID are optional. Swap "banking" for mf-sip or equity.',
        body: {}
      },
      {
        name: 'Consent Status (am I linked?)',
        method: 'GET',
        path: 'api/v1/moneyone/banking/consent/status',
        description:
          'Latest persisted consent for the logged-in user + template: { linked, status (pending|active|rejected|failed|expired|none), consentId, updatedAt }. Set by the callback after the user returns. This is the app\'s "am I linked?" check.'
      },
      {
        name: 'Revoke Consent',
        method: 'POST',
        path: 'api/v1/moneyone/banking/consent/revoke',
        description:
          'Withdraws a linked account. Body { consentId? } — optional; the server falls back to the user\'s latest consent for this template. Revokes at OneMoney (/revokeconsent), then marks the local record status=revoked so the app immediately shows "not linked". Returns { consentId, status: "revoked" }.',
        body: { consentId: '' }
      },
      {
        name: 'Accounts List (bank-list screen)',
        method: 'GET',
        path: 'api/v1/moneyone/banking/accounts',
        description:
          'STORE-AND-SYNC: reads the stored, normalized accounts from our DB (no FinPro call) → { accounts: [{ consentId, linkRefNumber, maskedAccountNumber, bank, holderName, fiType, category, headlineLabel, headlineValue, currency, lastSyncedAt, lastTxnDate, status }] }. holderName is decrypted for the list; the app card shows bank + holderName + masked account + category tag (balance intentionally hidden). Empty until the ingest job has run.'
      },
      {
        name: 'Account Detail (profile + summary)',
        method: 'GET',
        path: 'api/v1/moneyone/banking/accounts/:linkRef',
        description:
          'Detail header for one account from DB → account fields + { profile (name, maskedPan, email, mobile, address, kyc, nominee, …; decrypted, PAN masked), summaryFields:[{label,value}], holdings:[], dataRangeFrom, dataRangeTo }. Transactions are a separate paged call.'
      },
      {
        name: 'Transactions (paged + filtered)',
        method: 'GET',
        path: 'api/v1/moneyone/banking/accounts/:linkRef/transactions',
        description:
          'Lazy-loaded transactions from DB, newest first → { items:[…], page, limit, total, hasMore }. Unified bank (credit/debit) + investment (buy/sell) rows. Filters combine with AND.',
        query: [
          { key: 'page', value: '1', description: 'page number (1-based)' },
          { key: 'limit', value: '20', description: 'page size (max 100)' },
          { key: 'from', value: '', description: 'ISO date — start of range' },
          { key: 'to', value: '', description: 'ISO date — end of range' },
          { key: 'direction', value: '', description: 'CSV: credit,debit,buy,sell,installment' },
          { key: 'minAmount', value: '', description: 'min amount' },
          { key: 'maxAmount', value: '', description: 'max amount' },
          { key: 'search', value: '', description: 'text match on description' }
        ]
      },
      {
        name: 'Transactions Export (CSV)',
        method: 'GET',
        path: 'api/v1/moneyone/banking/accounts/:linkRef/transactions/export',
        description:
          'Streams a CSV download of ALL matching transactions (same filters as the list, no pagination). Content-Disposition: attachment.',
        query: [
          { key: 'from', value: '', description: 'ISO date' },
          { key: 'to', value: '', description: 'ISO date' },
          { key: 'direction', value: '', description: 'CSV of directions' },
          { key: 'search', value: '', description: 'text match' }
        ]
      },
      {
        name: 'Transactions Email',
        method: 'POST',
        path: 'api/v1/moneyone/banking/accounts/:linkRef/transactions/email',
        description:
          'Emails the filtered CSV statement to the user\'s OWN registered email (never an arbitrary address). Same filter query params as the list. Returns { to, count }.',
        body: {}
      },
      {
        name: 'Manual Sync (refresh now)',
        method: 'POST',
        path: 'api/v1/moneyone/banking/sync',
        description:
          'Forces a full re-ingest of the latest consent\'s data (getallfidata → normalize → upsert). Body { consentId? } optional. Returns the ingest summary { accounts, transactions, errors }.',
        body: { consentId: '' }
      },
      {
        name: 'Consent Callback (PUBLIC — server-to-server)',
        method: 'GET',
        path: 'api/v1/investment/callback',
        description:
          'PUBLIC — no auth. OneMoney redirects the user\'s browser here with ?token=<random>. The server verifies the real status against OneMoney (never trusts the URL), updates the consent, and 302-redirects to the app deep link (foldy://moneyone/callback?status=…). Not called by clients directly — documented for completeness.',
        query: [{ key: 'token', value: '', description: 'the token from Create Consent' }]
      },
      {
        name: 'Webhook (PROVIDER → server, not /api)',
        method: 'POST',
        path: 'webhook/moneyone',
        description:
          'Provider-called (NOT under /api, NOT auth). OneMoney POSTs consent lifecycle events here — signature-verified via X-Webhook-Signature/X-Webhook-Timestamp against MONEYONE_WEBHOOK_SECRET, idempotent on transaction_id. Events: ANALYTICS_CALLBACK, NUDGES_CALLBACK, CONSENT_REVOKED_CALLBACK. Documented for reference; the console base URL targets /api so it can\'t drive this.',
        body: { event: 'CONSENT_REVOKED_CALLBACK', transaction_id: '<txn>', timestamp: 1719400000, data: { consentId: '<consentId>' } }
      },
      {
        name: 'Resolve Consent',
        method: 'GET',
        path: 'api/v1/moneyone/banking/consent/resolve',
        description:
          'Exchanges the consentHandle from Create Consent for { consentID, status, accounts }.',
        query: [{ key: 'handle', value: '', description: 'consentHandle from Create Consent' }]
      },
      {
        name: 'Get All Data',
        method: 'GET',
        path: 'api/v1/moneyone/banking/data/:consentId/all',
        description: 'All financial data available under a granted consent.'
      },
      {
        name: 'Get Account Data',
        method: 'GET',
        path: 'api/v1/moneyone/banking/data/:consentId/account/:linkRef',
        description: 'One linked account\'s transactions (FinPro /getfidata). Optional ?limit&offset page the transactions so the app pulls a bank\'s data in windows instead of every transaction at once; omit both to fetch all.',
        query: [
          { key: 'limit', value: '', description: 'optional: max transactions per page' },
          { key: 'offset', value: '', description: 'optional: starting point' }
        ]
      },
      {
        name: 'Get Account Balance',
        method: 'GET',
        path: 'api/v1/moneyone/banking/data/:consentId/account/:linkRef/balance',
        description: 'Balance for a single linked account.'
      }
    ]
  },

  investment: {
    key: 'investment',
    name: 'Investment (B2B portfolio)',
    description:
      'B2B-gated Investment module at /api/v1/investment (requireB2B + investment entitlement). Adds portfolio/net-worth analytics computed from the stored AA accounts & transactions — the business-side equivalent of /b2c/reports. NOTE: this mount ALSO re-serves every MoneyOne template route, so /api/v1/investment/:template/... (banking | equity | mf-sip | insurance_policies) works exactly like the shared /api/v1/moneyone/:template/... in the MoneyOne section. Set {{token}} to a business JWT.',
    endpoints: [
      { name: 'Portfolio Overview', method: 'GET', path: 'api/v1/investment/overview', description: 'Composite portfolio home: net worth + cash flow + consent health + SIP, from stored data (no FinPro call).' },
      { name: 'Home (alias of Overview)', method: 'GET', path: 'api/v1/investment/home', description: 'Same handler as /overview — kept so the app can use either name.' },
      { name: 'Net Worth', method: 'GET', path: 'api/v1/investment/net-worth', description: 'Net-worth breakdown across linked bank / equity / MF accounts.' },
      { name: 'Cash Flow', method: 'GET', path: 'api/v1/investment/cash-flow', description: 'Inflow / outflow over recent months.', query: [{ key: 'months', value: '6' }] },
      { name: 'Consent Health', method: 'GET', path: 'api/v1/investment/consents', description: 'Per-template AA consent status + expiry, for the "reconnect" prompts.' },
      { name: 'SIP Tracker', method: 'GET', path: 'api/v1/investment/sip', description: 'Detected recurring SIP contributions from the stored MF transactions.' },
      { name: 'AA Consent Callback (PUBLIC)', method: 'GET', path: 'api/v1/investment/callback', description: 'PUBLIC, no JWT — OneMoney redirects the user\'s browser here after they approve/decline. Authenticates on an unguessable token, finalises the consent, then deep-links back into the app (foldy://). Moved here from the old /b2c/moneyone/callback.', query: [{ key: 'token', value: '<callback-token>' }] }
    ]
  },

  incomeTax: {
    key: 'incomeTax',
    name: 'Income Tax (ITR + 26AS + AIS)',
    description: 'Deepvue-backed e-filing portal: link once (username/password → opaque client id), then pull filed ITRs, Form 26AS and the AIS. Common to B2B + B2C (itr module). Set {{token}}.',
    endpoints: [
      { name: 'Portal Link Status', method: 'GET', path: 'api/v1/income-tax/itr-client/status', description: 'Is the e-filing portal linked, and when data was last pulled.' },
      { name: 'Link Portal Account', method: 'POST', path: 'api/v1/income-tax/itr-client', description: 'Exchange e-filing portal credentials for a client id (once). Password is never stored.', body: { username: 'ABCDE1234F', password: '<portal-password>' } },
      { name: 'Unlink Portal Account', method: 'DELETE', path: 'api/v1/income-tax/itr-client', description: 'Removes the stored client id.' },
      { name: 'Download ITR List', method: 'POST', path: 'api/v1/income-tax/itr/download', description: 'Triggers a fetch; returns { panNo, items[] } of filed ITRs. Charges an ITR download credit.', body: {} },
      { name: 'ITR Details', method: 'GET', path: 'api/v1/income-tax/itr/:itrId', description: 'Curated ITR detail: personal + income + bank accounts (no raw dump).', pathVars: [{ key: 'itrId', value: '<itrId>' }] },
      { name: 'Download 26AS List', method: 'POST', path: 'api/v1/income-tax/26as/download', description: 'Triggers a fetch; returns { panNo, items[] } of 26AS statements. Charges an income-tax (itr) download credit.', body: {} },
      { name: '26AS Details', method: 'GET', path: 'api/v1/income-tax/26as/:tdsId', description: 'Parsed Form 26AS TDS entries + total.', pathVars: [{ key: 'tdsId', value: '<tdsId>' }], query: [{ key: 'financialYear', value: '2024-25' }] },
      { name: 'Download AIS List', method: 'POST', path: 'api/v1/income-tax/ais/download', description: 'Triggers a fetch of the Annual Information Statement; returns { panNo, items[] } of the financial years the portal holds. Charges an income-tax (itr) download credit.', body: {} },
      { name: 'AIS Details', method: 'GET', path: 'api/v1/income-tax/ais/:financialYear', description: 'A single financial year\'s Annual Information Statement. Addressed by FINANCIAL YEAR, not an id (unlike ITR / 26AS). financialYear is required.', pathVars: [{ key: 'financialYear', value: '2024-25' }] },
      { name: 'Render Statement PDF', method: 'POST', path: 'api/v1/income-tax/:itType', description: 'Renders the statement PDF server-side (itType: 26as or itr-x). Charges an income-tax (itr) download credit.', pathVars: [{ key: 'itType', value: '26as' }], body: { downloadLink: '<s3-json-url>', pan: 'ABCDE1234F', financialYear: '2024-25' } }
    ]
  },

  reports: {
    key: 'reports',
    name: 'Reports (B2B)',
    description: 'GST compliance reports & analytics for business users. Set {{token}} (business JWT, gst module).',
    endpoints: [
      { name: 'Late-Fee Exposure', method: 'GET', path: 'api/v1/b2b/reports/late-fee' },
      { name: 'Turnover Bands', method: 'GET', path: 'api/v1/b2b/reports/late-fee/turnover-bands' },
      { name: 'Mark Return Nil', method: 'PATCH', path: 'api/v1/b2b/reports/late-fee/returns/:alertId/nil', pathVars: [{ key: 'alertId', value: '<alertId>' }] },
      { name: 'Multi-GSTIN Grid', method: 'GET', path: 'api/v1/b2b/reports/gstin-grid' },
      { name: 'Sales Trend', method: 'GET', path: 'api/v1/b2b/reports/sales-trend', query: [{ key: 'fy', value: '2024-25' }, { key: 'gstin', value: '' }] },
      { name: 'Compliance Calendar', method: 'GET', path: 'api/v1/b2b/reports/compliance-calendar' },
      { name: 'Snapshot Coverage', method: 'GET', path: 'api/v1/b2b/reports/snapshot-coverage' },
      { name: 'B2B Summary', method: 'GET', path: 'api/v1/b2b/reports/summary', description: 'Cross-module counts (GST + ROC + TDS + ITR) for the B2B home header. Not GST-gated, unlike the other reports here.' }
    ]
  },

  home: {
    key: 'home',
    name: 'Home (B2C)',
    description: 'B2C individual home dashboard: net worth, cash flow, SIP tracker, consent health. Reads stored FiAccount/FiTransaction data only (fast, no provider calls). Set {{token}}.',
    endpoints: [
      { name: 'Home Summary', method: 'GET', path: 'api/v1/b2c/reports' },
      { name: 'SIP Tracker', method: 'GET', path: 'api/v1/b2c/reports/sip' },
      { name: 'Net Worth', method: 'GET', path: 'api/v1/b2c/reports/net-worth' },
      { name: 'Cash Flow', method: 'GET', path: 'api/v1/b2c/reports/cash-flow', query: [{ key: 'months', value: '6' }] },
      { name: 'Consent Health', method: 'GET', path: 'api/v1/b2c/reports/consents' }
    ]
  },

  bank: {
    key: 'bank',
    name: 'Bank Info',
    description: 'IFSC / bank metadata lookup.',
    endpoints: [
      { name: 'Get Bank Info', method: 'GET', path: 'api/v1/bank-info', query: [{ key: 'ifsc', value: 'HDFC0000001' }] }
    ]
  },

  manualUploads: {
    key: 'manualUploads',
    name: 'Manual Uploads',
    description: 'User-uploaded compliance docs (PTAX, trade license, PF/ESI, property papers) by category. Set {{token}}.',
    endpoints: [
      { name: 'Categories', method: 'GET', path: 'api/v1/manual-uploads/categories' },
      { name: 'List Items', method: 'GET', path: 'api/v1/manual-uploads/:category/items', pathVars: [{ key: 'category', value: 'ptax' }] },
      { name: 'Upload Item', method: 'POST', path: 'api/v1/manual-uploads/:category/upload', description: 'multipart, field "file".', pathVars: [{ key: 'category', value: 'ptax' }] },
      { name: 'Download Item', method: 'GET', path: 'api/v1/manual-uploads/items/:id/download', pathVars: [{ key: 'id', value: '<itemId>' }] },
      { name: 'Move Item to Trash', method: 'DELETE', path: 'api/v1/manual-uploads/items/:id', description: 'Soft delete (was a hard delete). { id, holdUntil (null for an owner, now + 7d for a delegated session), purgeAt }.', pathVars: [{ key: 'id', value: '<itemId>' }] },
      { name: 'List Trash', method: 'GET', path: 'api/v1/manual-uploads/trash', description: 'Max 200, newest deletion first; items carry trashedByName, trashedByOwner, holdUntil.' },
      { name: 'Restore Item', method: 'POST', path: 'api/v1/manual-uploads/items/:id/restore', description: 'vault.delete. Two 409s without an errorCode (period clash / purge race).', pathVars: [{ key: 'id', value: '<itemId>' }] },
      { name: 'Empty Trash', method: 'DELETE', path: 'api/v1/manual-uploads/trash', description: 'Owner session only; held items skipped. { deleted, remaining, held, heldUntil }.' }
    ]
  },

  notifications: {
    key: 'notifications',
    name: 'Notifications',
    description: 'In-app notification feed for the logged-in user. Set {{token}}.',
    endpoints: [
      { name: 'List', method: 'GET', path: 'api/v1/notifications' },
      { name: 'Unread Count', method: 'GET', path: 'api/v1/notifications/unread-count' },
      { name: 'Mark Read', method: 'POST', path: 'api/v1/notifications/:id/read', pathVars: [{ key: 'id', value: '<notificationId>' }] },
      { name: 'Mark All Read', method: 'POST', path: 'api/v1/notifications/read-all' },
      { name: 'Delete', method: 'DELETE', path: 'api/v1/notifications/:id', pathVars: [{ key: 'id', value: '<notificationId>' }] }
    ]
  }
};

export function getSection(key: string): ApiSection | undefined {
  return API_SECTIONS[key];
}
