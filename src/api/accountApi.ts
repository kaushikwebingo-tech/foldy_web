import { client } from './client';

/*
 * Director access (co-users on a company account). Mirrors /api/v1/account/*
 * (accountMemberRoutes + accountAuditRoutes). Contract: DIRECTOR_ACCESS_API_CONTRACT.md §2-4.
 *
 * Sessions: a DELEGATED token ({ id: company, act: director, mem: membership })
 * is what POST /memberships/enter returns. Member administration, invitations and
 * memberships are owner / personal-session only — a delegated caller gets 403
 * MEMBER_OWNER_ONLY from the member gate first.
 *
 * MEMBERS_ENABLED (server env, default off): invite, role change, cancel invite,
 * role create/update/delete, claim, decline and enter answer 404 NOT_FOUND when off.
 * GET /me/permissions still answers and returns membersEnabled.
 */
export const accountApi = {
  // ── Owner side ──────────────────────────────────────────────────────
  // { members[], pendingInvites[] }. Seeds the four system roles + owner row on first call.
  listMembers: () =>
    client.get('/account/members'),

  // Business workspace only. The code goes out by SMS and is never returned.
  // Re-inviting the same number replaces the live invite (title/pan left out are cleared).
  // Unknown keys are refused with 422.
  inviteMember: (payload: { phoneno: string; roleId: string; title?: string; pan?: string }) =>
    client.post('/account/members/invite', payload),

  // Approve (pending_approval → active), suspend, or re-activate. :id = membership id.
  setMemberStatus: (membershipId: string, status: 'active' | 'suspended') =>
    client.patch(`/account/members/${membershipId}`, { status }),

  // Takes effect on the member's next request; sessions are not ended.
  changeMemberRole: (membershipId: string, roleId: string) =>
    client.patch(`/account/members/${membershipId}/role`, { roleId }),

  // Ends their sessions, removes links, handset rows and Cabinet PIN, deletes the row.
  removeMember: (membershipId: string) =>
    client.delete(`/account/members/${membershipId}`),

  // Hard delete; frees the seat. Also works on an expired invite not yet swept.
  cancelInvite: (inviteId: string) =>
    client.delete(`/account/invites/${inviteId}`),

  // ── Roles ───────────────────────────────────────────────────────────
  listRoles: () =>
    client.get('/account/roles'),

  // 201. permissions must come from the 41-name vocabulary; owner-only names
  // (members.*, roles.create/update/delete) are refused with 422.
  createRole: (payload: { name: string; description?: string; permissions: string[] }) =>
    client.post('/account/roles', payload),

  // At least one field. `permissions` REPLACES the list. System roles → 403 MEMBER_ROLE_IMMUTABLE.
  updateRole: (roleId: string, payload: { name?: string; description?: string; permissions?: string[] }) =>
    client.patch(`/account/roles/${roleId}`, payload),

  // 409 MEMBER_ROLE_IN_USE while any membership or live invite holds it.
  deleteRole: (roleId: string) =>
    client.delete(`/account/roles/${roleId}`),

  // ── Invitee side (personal session) ─────────────────────────────────
  // Live invitations addressed to the caller's own mobile.
  listInvitations: () =>
    client.get('/account/invitations'),

  // Individual workspace + PAN on file. code = the 6-digit SMS code. Send
  // invitationId — it is required when the caller holds more than one invite.
  claimInvitation: (code: string, invitationId?: string) =>
    client.post('/account/invitations/claim', { code, ...(invitationId ? { invitationId } : {}) }),

  declineInvitation: (inviteId: string) =>
    client.post(`/account/invitations/${inviteId}/decline`),

  // Companies I belong to, every status. Only `active` rows can be entered.
  listMemberships: () =>
    client.get('/account/memberships'),

  // Returns { token (delegated), account, role, permissions }. Not from inside
  // another company. Send device headers in the app; the console sends none.
  enterMembership: (accountId: string) =>
    client.post('/account/memberships/enter', { accountId }),

  // ── Any session ─────────────────────────────────────────────────────
  // { isOwner, accountName, roleName, permissions[], membersEnabled } — the
  // authoritative "am I delegated / what may I do" read.
  myPermissions: () =>
    client.get('/account/me/permissions'),

  // Activity log, newest first, keyset paged. Unknown query keys are refused (422).
  // from/to: ISO or bare YYYY-MM-DD (IST whole day). Pass nextCursor back as cursor.
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
