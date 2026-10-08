import { client } from './client';

/*
 * Team & access on a company workspace. Mirrors /api/v1/account/*
 * (accountMemberRoutes on the legacy JWT, plus auditRoutes' `/account/audit`,
 * which is on the NEW-model session) AS THE SERVER STANDS TODAY.
 *
 * THIS SURFACE IS MID-REBUILD, AND THE SPLIT MATTERS. RBAC_MASTER_PLAN.md §11.3
 * phase 5 rewrites `AccountMembership` / `AccountRole` into `memberships` (§7.3)
 * and `tenant_roles` (§7.4), and `accountMemberService` into `tenantService` +
 * `staffService`. Until that lands the routes below are the real ones, so they are
 * kept and driven; what the PLAN changes about their MEANING is written on each
 * one, because the console is the place those two versions are compared.
 *
 * WHAT THE PLAN CHANGES, in one place so it is not repeated on every method:
 *   - No invitations. §4.1: the admin creates the staff member outright (four
 *     fields: full name, mobile, email optional, role) and the person claims it
 *     with a one-time password (§4.2). `POST /account/memberships` is that route
 *     already; `/members/invite`, `/invites/:id` and `/invitations*` are DELETED.
 *   - Statuses served are `active | suspended` — no `invited` (R21), no
 *     `pending_approval`; removal hard-deletes the row, so there is no `removed` either.
 *   - Roles are per tenant with four system rows — Administrator (stored key
 *     `administration`), Accountant, Clerk, Viewer (§6.1) — and the permission
 *     vocabulary is the TWENTY-SIX names of §6.4, not the old 41. The console must
 *     not hardcode either list: both are read from the server (§6.4, §7.12).
 *   - Seats are not heads (§6.1 decision L3, §7.10): Administrator and Clerk
 *     consume a seat, Accountant and Viewer consume none, a custom role consumes
 *     one unless it is read-only, and a SUSPENDED member consumes none (R18). A
 *     full plan answers 409 TENANT_SEAT_UNAVAILABLE with the numbers.
 *   - Two owner-only locks no role can carry (§6.2, §6.3): only the owner may
 *     create, edit or assign a role holding `team.manage` or `roles.manage`, and
 *     only the owner may suspend, remove or re-role somebody who holds one.
 *
 * Sessions (today): a DELEGATED token ({ id: company, act: director, mem:
 * membership }) is what POST /memberships/enter returns. Member administration and
 * memberships are owner / personal-session only — a delegated caller gets 403
 * MEMBER_OWNER_ONLY from the member gate first.
 *
 * MEMBERS_ENABLED (server env, default off): create, role change, role
 * create/update/delete and enter answer 404 NOT_FOUND when off. GET
 * /me/permissions still answers and returns membersEnabled.
 */
export const accountApi = {
  // ── Owner side ──────────────────────────────────────────────────────
  // { members[] } only — there is no `pendingInvites` and no `invited` row (R21).
  // Seeds the four system roles + owner row on first call.
  listMembers: () =>
    client.get('/account/members'),

  /*
   * §4.1's add-staff screen — the owner CREATES the member; nothing is invited.
   * Business workspace only. Mounted on `memberships` (not `members`) because
   * MEMBER_ROUTE_POLICY already maps that prefix to OWNER_ONLY, and an unmapped
   * path is how a route ships with no member gate at all.
   * `name`, `mobile` and `role` are the plan's fields and `email` is its optional
   * fourth; `pan`, `dob` and `title` are pre-plan extras the route still accepts.
   * Over the plan's seats → 409 TENANT_SEAT_UNAVAILABLE (§4.7's one prompt).
   */
  createMember: (payload: {
    name: string;
    mobile: string;
    role: string;
    email?: string;
    pan?: string;
    dob?: string;
    title?: string;
  }) => client.post('/account/memberships', payload),

  // Suspend or re-activate. :id = membership id. §7.10: suspending FREES a seat at
  // once and reactivating CONSUMES one, so a reactivation can be refused with 409.
  setMemberStatus: (membershipId: string, status: 'active' | 'suspended') =>
    client.patch(`/account/members/${membershipId}`, { status }),

  // Takes effect on the member's next tap (§6.3), not on their next login.
  // §7.10: a change crossing the free/paid line moves a seat, and one that needs a
  // seat with none free is refused before anything is written.
  changeMemberRole: (membershipId: string, roleId: string) =>
    client.patch(`/account/members/${membershipId}/role`, { roleId }),

  // Ends their sessions, removes links, handset rows and Cabinet PIN, deletes the
  // row. §6.3: a non-owner may not remove somebody holding team.manage/roles.manage.
  removeMember: (membershipId: string) =>
    client.delete(`/account/members/${membershipId}`),

  // ── Roles ───────────────────────────────────────────────────────────
  // The four system roles plus this workspace's custom ones. THIS IS THE ROLE
  // LIST — the console never carries one of its own (§6.4).
  listRoles: () =>
    client.get('/account/roles'),

  // 201. `permissions` comes from the SERVED vocabulary, never from a list typed
  // into this console. Owner-only names are refused 422.
  createRole: (payload: { name: string; description?: string; permissions: string[] }) =>
    client.post('/account/roles', payload),

  // At least one field. `permissions` REPLACES the list. System roles → 403
  // MEMBER_ROLE_IMMUTABLE. §6.3: the RESULTING set must be a subset of what the
  // writer holds, on edit exactly as on create.
  updateRole: (roleId: string, payload: { name?: string; description?: string; permissions?: string[] }) =>
    client.patch(`/account/roles/${roleId}`, payload),

  // 409 MEMBER_ROLE_IN_USE while any membership holds it (§6.3 reports the count).
  deleteRole: (roleId: string) =>
    client.delete(`/account/roles/${roleId}`),

  // ── Member side (personal session) ──────────────────────────────────
  // Companies I belong to, every status. Only `active` rows can be entered.
  // §5.4 replaces this with identityApi.workspaces(), which also LISTS a workspace
  // whose plan has lapsed, badged "Payment due", rather than hiding it (R6).
  listMemberships: () =>
    client.get('/account/memberships'),

  // Returns { token (delegated), account, role, permissions }. Not from inside
  // another company. Send device headers in the app; the console sends none.
  // §5.4 replaces this with identityApi.switchWorkspace(), which swaps one
  // person's session token instead of minting a second identity's.
  enterMembership: (accountId: string) =>
    client.post('/account/memberships/enter', { accountId }),

  // Leaving is the member's own decision, taken from their own session.
  leaveMembership: (membershipId: string) =>
    client.post(`/account/memberships/${membershipId}/leave`),

  // ── Any session ─────────────────────────────────────────────────────
  // { isOwner, accountName, roleName, permissions[], membersEnabled } — the
  // legacy "am I delegated / what may I do" read. §7.12's access envelope
  // (GET /v1/workspace/access) and §6.4's GET /v1/meta/permissions are BUILT and
  // replace it for new-model sessions.
  myPermissions: () =>
    client.get('/account/me/permissions'),

  // Activity log, newest first, keyset paged. Unknown query keys are refused (422).
  // NOT legacy: auditRoutes serves it on the NEW-model session (personAuth needs
  // sub/tid/mid) with `audit.read`; a legacy JWT gets 401. `actor` is a Person id.
  // from/to: ISO or bare YYYY-MM-DD (IST whole day). Pass nextCursor back as cursor.
  // §6.2: EXPORTING it is owner-only and is deliberately not a permission at all.
  listAudit: (params: {
    area?: string;
    actor?: string;
    operation?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  } = {}) =>
    client.get('/account/audit', {
      params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')),
    }),
};

/*
 * GONE, NOT MISSING — the invitation family.
 *
 * `POST /account/members/invite`, `DELETE /account/invites/:id`,
 * `GET /account/invitations`, `POST /account/invitations/claim` and
 * `POST /account/invitations/:id/decline` are all deleted server-side (§11.2:
 * `AccountInvite`, its sweep cron and its five routes), so the five client methods
 * that drove them are removed rather than left to 404. §4.1-§4.2 replace the whole
 * shape: the admin creates the member with `createMember` above, and the person
 * claims it with an 8-character one-time password, which is a sign-in-side flow
 * (`identityApi`) and not a team-panel one.
 */
