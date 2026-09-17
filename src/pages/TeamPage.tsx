import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { accountApi } from '@/api/accountApi';
import { authApi } from '@/api/authApi';
import { getToken, setToken, removeToken } from '@/lib/utils';
import { Users } from 'lucide-react';

/*
 * Director access — a company account's co-users. Backend:
 * server/src/routes/app/v1/{accountMemberRoutes,accountAuditRoutes}.ts
 * (/api/v1/account). Contract: DIRECTOR_ACCESS_API_CONTRACT.md §2-4, §12.
 *
 * A delegated session is just another JWT, so "entering" a company can swap the
 * console token; the personal token is stashed so Leave can put it back — the
 * server has no exit endpoint and never gives the personal token back.
 */
const PERSONAL_TOKEN_KEY = 'foldy_personal_token';

function jwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1] ?? '';
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(b64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const csv = (s: string) => s.split(',').map((p) => p.trim()).filter(Boolean);

export default function TeamPage() {
  // Re-render the session banner after the console token is swapped.
  const [, setTokenTick] = useState(0);
  const refreshSession = () => setTokenTick((t) => t + 1);

  // Owner: members + invites
  const [phoneno, setPhoneno] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const [invitePan, setInvitePan] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [memberStatus, setMemberStatus] = useState('active');
  const [memberRoleId, setMemberRoleId] = useState('');
  const [inviteId, setInviteId] = useState('');

  // Owner: roles
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePerms, setRolePerms] = useState('gst.read, itr.read, vault.read');

  // Director (personal session)
  const [invitationId, setInvitationId] = useState('');
  const [code, setCode] = useState('');
  const [accountId, setAccountId] = useState('');
  const [switchToken, setSwitchToken] = useState('yes');

  // Activity log
  const [area, setArea] = useState('');
  const [actor, setActor] = useState('');
  const [operation, setOperation] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cursor, setCursor] = useState('');
  const [limit, setLimit] = useState('50');

  const payload = jwtPayload(getToken());
  const act = payload?.act ? String(payload.act) : '';
  const delegated = !!act && act !== String(payload?.id ?? '');
  const stashed = !!getToken(PERSONAL_TOKEN_KEY);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Team & Director Access"
        subtitle="Company accounts invite individual accounts, who open a delegated session on the company. Member administration is owner-only; invitations and memberships belong to the director's personal session."
        icon={<Users size={18} />}
        badge="Auth Required"
        postmanSection="account"
      />

      <div
        className={`mb-4 px-4 py-3 rounded-lg text-xs border ${
          delegated ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}
      >
        {!payload ? (
          <span><strong>No token.</strong> Log in first.</span>
        ) : delegated ? (
          <span>
            <strong>Delegated session</strong> — company <code>{String(payload.id)}</code>, director{' '}
            <code>{act}</code>, membership <code>{String(payload.mem ?? '')}</code>. The member gate applies to every call.
          </span>
        ) : (
          <span>
            <strong>Owner / personal session</strong> — account <code>{String(payload.id ?? '')}</code>. No gate: everything is allowed.
          </span>
        )}
        <span className="block mt-1">
          The server flag <code>MEMBERS_ENABLED</code> is off by default: invite, role change, cancel invite, role
          create/update/delete, claim, decline and enter then answer <code>404 NOT_FOUND</code>. Read it with Me — Permissions.
        </span>
      </div>

      <div className="space-y-4">
        {/* ---------- Any session ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">Any session</p>

        <ApiCard
          title="Me — Permissions"
          method="GET"
          endpoint="/api/v1/account/me/permissions"
          description="{ isOwner, accountName, roleName, permissions[], membersEnabled }. Non-delegated sessions get isOwner true and all 41 permissions. This is how the app gates Team features."
          onSubmit={() => accountApi.myPermissions()}
        />

        <ApiCard
          title="Activity Log"
          method="GET"
          endpoint="/api/v1/account/audit"
          description="Owner, or a delegated role with auditLogs.read. Newest first; paste nextCursor into Cursor for the next page. Dates: ISO or YYYY-MM-DD (IST whole day). Blank fields are not sent (unknown keys are refused)."
          onSubmit={() =>
            accountApi.listAudit({
              area: area.trim(),
              actor: actor.trim(),
              operation: operation.trim(),
              from: from.trim(),
              to: to.trim(),
              cursor: cursor.trim(),
              limit: limit ? Number(limit) : undefined,
            })
          }
        >
          <Field label="Area (optional)" value={area} onChange={setArea} placeholder="members | vault | gst" />
          <Field label="Operation (optional)" value={operation} onChange={setOperation} placeholder="trash | access_denied" />
          <Field label="Actor user id (optional)" value={actor} onChange={setActor} placeholder="24-hex user id" />
          <Field label="Limit" value={limit} onChange={setLimit} placeholder="1-100" type="number" />
          <Field label="From (optional)" value={from} onChange={setFrom} placeholder="2026-09-01" />
          <Field label="To (optional)" value={to} onChange={setTo} placeholder="2026-09-17" />
          <Field label="Cursor (optional)" value={cursor} onChange={setCursor} placeholder="nextCursor" fullWidth />
        </ApiCard>

        {/* ---------- Owner: members ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Owner · members &amp; invitations</p>

        <ApiCard
          step={1}
          title="List Members + Pending Invites"
          method="GET"
          endpoint="/api/v1/account/members"
          description="Owner session only. members[].id is the MEMBERSHIP id used below; pendingInvites[].id is the invite id. Seeds the system roles and the owner row on first call."
          onSubmit={() => accountApi.listMembers()}
        />

        <ApiCard
          step={2}
          title="Invite Member"
          method="POST"
          endpoint="/api/v1/account/members/invite"
          description="Business workspace. roleId from List Roles (not Owner). The code goes out by SMS and is never returned. Re-inviting a live number replaces the invite. Over the plan's seats → 403 MEMBER_PLAN_LIMIT_REACHED { limit, used }."
          buttonLabel="Invite"
          onSubmit={() =>
            accountApi.inviteMember({
              phoneno: phoneno.trim(),
              roleId: inviteRoleId.trim(),
              ...(inviteTitle.trim() ? { title: inviteTitle.trim() } : {}),
              ...(invitePan.trim() ? { pan: invitePan.trim() } : {}),
            })
          }
        >
          <Field label="Mobile" value={phoneno} onChange={setPhoneno} placeholder="9876543210" />
          <Field label="Role ID" value={inviteRoleId} onChange={setInviteRoleId} placeholder="from List Roles" />
          <Field label="Title (optional, ≤ 80)" value={inviteTitle} onChange={setInviteTitle} placeholder="Director — Finance" />
          <Field label="Pin to PAN (optional)" value={invitePan} onChange={setInvitePan} placeholder="ABCDE1234F" />
        </ApiCard>

        <ApiCard
          step={3}
          title="Approve / Suspend / Re-activate"
          method="PATCH"
          endpoint="/api/v1/account/members/:id"
          description="active approves a pending member or re-activates a suspended one (needs a free seat). suspended frees the seat and ends their sessions at once."
          buttonLabel="Set Status"
          onSubmit={() => accountApi.setMemberStatus(membershipId.trim(), memberStatus as 'active' | 'suspended')}
        >
          <Field label="Membership ID" value={membershipId} onChange={setMembershipId} placeholder="members[].id" />
          <SelectField
            label="Status"
            value={memberStatus}
            onChange={setMemberStatus}
            options={[
              { label: 'active (approve / re-activate)', value: 'active' },
              { label: 'suspended', value: 'suspended' },
            ]}
          />
        </ApiCard>

        <ApiCard
          step={4}
          title="Change Member Role"
          method="PATCH"
          endpoint="/api/v1/account/members/:id/role"
          description="Applies on the member's next request; their sessions are not ended."
          buttonLabel="Change Role"
          onSubmit={() => accountApi.changeMemberRole(membershipId.trim(), memberRoleId.trim())}
        >
          <Field label="Membership ID" value={membershipId} onChange={setMembershipId} placeholder="members[].id" />
          <Field label="Role ID" value={memberRoleId} onChange={setMemberRoleId} placeholder="from List Roles" />
        </ApiCard>

        <ApiCard
          step={5}
          title="Remove Member"
          method="DELETE"
          endpoint="/api/v1/account/members/:id"
          description="Ends every session they hold on the company, removes their links, handset rows and Cabinet PIN, then deletes the membership. Their uploads stay."
          buttonLabel="Remove"
          onSubmit={() => accountApi.removeMember(membershipId.trim())}
        >
          <Field label="Membership ID" value={membershipId} onChange={setMembershipId} placeholder="members[].id" fullWidth />
        </ApiCard>

        <ApiCard
          step={6}
          title="Cancel Invitation"
          method="DELETE"
          endpoint="/api/v1/account/invites/:id"
          description="Hard delete; frees the seat. Works on an expired invite too."
          buttonLabel="Cancel Invite"
          onSubmit={() => accountApi.cancelInvite(inviteId.trim())}
        >
          <Field label="Invite ID" value={inviteId} onChange={setInviteId} placeholder="pendingInvites[].id" fullWidth />
        </ApiCard>

        {/* ---------- Owner: roles ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Owner · roles</p>

        <ApiCard
          title="List Roles"
          method="GET"
          endpoint="/api/v1/account/roles"
          description="System roles (Owner, Manager, Accountant, Viewer) resolve from code and cannot be edited; custom roles are per account. moduleAccess is stored but not enforced."
          onSubmit={() => accountApi.listRoles()}
        />

        <ApiCard
          title="Create Custom Role"
          method="POST"
          endpoint="/api/v1/account/roles"
          description="Permissions comma-separated, from the 41-name vocabulary. members.invite/approve/update/remove and roles.create/update/delete are owner-only (422). 201 on success."
          buttonLabel="Create"
          onSubmit={() =>
            accountApi.createRole({
              name: roleName.trim(),
              ...(roleDesc ? { description: roleDesc } : {}),
              permissions: csv(rolePerms),
            })
          }
        >
          <Field label="Name" value={roleName} onChange={setRoleName} placeholder="CA Firm" />
          <Field label="Description (optional)" value={roleDesc} onChange={setRoleDesc} placeholder="Our auditors" />
          <Field label="Permissions (comma-separated)" value={rolePerms} onChange={setRolePerms} placeholder="gst.read, itr.read, vault.read" fullWidth />
        </ApiCard>

        <ApiCard
          title="Update Custom Role"
          method="PATCH"
          endpoint="/api/v1/account/roles/:id"
          description="Reuses the Create fields — only non-empty ones are sent. permissions REPLACES the list. System roles → 403 MEMBER_ROLE_IMMUTABLE."
          buttonLabel="Update"
          onSubmit={() =>
            accountApi.updateRole(roleId.trim(), {
              ...(roleName.trim() ? { name: roleName.trim() } : {}),
              ...(roleDesc ? { description: roleDesc } : {}),
              ...(rolePerms.trim() ? { permissions: csv(rolePerms) } : {}),
            })
          }
        >
          <Field label="Role ID" value={roleId} onChange={setRoleId} placeholder="roles[].id" fullWidth />
        </ApiCard>

        <ApiCard
          title="Delete Custom Role"
          method="DELETE"
          endpoint="/api/v1/account/roles/:id"
          description="Refused (409 MEMBER_ROLE_IN_USE) while any member or live invite holds it."
          buttonLabel="Delete"
          onSubmit={() => accountApi.deleteRole(roleId.trim())}
        >
          <Field label="Role ID" value={roleId} onChange={setRoleId} placeholder="roles[].id" fullWidth />
        </ApiCard>

        {/* ---------- Director: personal session ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Director · personal session</p>

        <ApiCard
          step={1}
          title="My Invitations"
          method="GET"
          endpoint="/api/v1/account/invitations"
          description="Live invitations addressed to this account's mobile. Copy the id into Claim."
          onSubmit={() => accountApi.listInvitations()}
        />

        <ApiCard
          step={2}
          title="Claim Invitation"
          method="POST"
          endpoint="/api/v1/account/invitations/claim"
          description="Individual workspace with a PAN on file. Code = the 6-digit SMS code (5 attempts). Creates a pending_approval membership — the owner approves it in step 3 above."
          buttonLabel="Claim"
          onSubmit={() => accountApi.claimInvitation(code.trim(), invitationId.trim() || undefined)}
        >
          <Field label="Invitation ID" value={invitationId} onChange={setInvitationId} placeholder="invitations[].id" />
          <Field label="Code" value={code} onChange={setCode} placeholder="6 digits" />
        </ApiCard>

        <ApiCard
          step={3}
          title="Decline Invitation"
          method="POST"
          endpoint="/api/v1/account/invitations/:id/decline"
          description="Hard delete, so the owner can invite again later."
          buttonLabel="Decline"
          onSubmit={() => accountApi.declineInvitation(invitationId.trim())}
        >
          <Field label="Invitation ID" value={invitationId} onChange={setInvitationId} placeholder="invitations[].id" fullWidth />
        </ApiCard>

        <ApiCard
          step={4}
          title="My Memberships"
          method="GET"
          endpoint="/api/v1/account/memberships"
          description="Companies this account belongs to, every status. Only active rows can be entered."
          onSubmit={() => accountApi.listMemberships()}
        />

        <ApiCard
          step={5}
          title="Enter Company"
          method="POST"
          endpoint="/api/v1/account/memberships/enter"
          description="Returns a delegated token (1 day, no refresh). With Switch = yes the console stores it as the active token and stashes the personal one for Leave. Re-entering from the same device ends the earlier delegated session."
          buttonLabel="Enter"
          onSubmit={async () => {
            const res = await accountApi.enterMembership(accountId.trim());
            const token = res.data?.data?.token as string | undefined;
            if (switchToken === 'yes' && token) {
              const personal = getToken();
              if (personal) setToken(personal, PERSONAL_TOKEN_KEY);
              setToken(token);
              refreshSession();
            }
            return res;
          }}
        >
          <Field label="Account ID" value={accountId} onChange={setAccountId} placeholder="accounts[].accountId" />
          <SelectField
            label="Switch console to the delegated token"
            value={switchToken}
            onChange={setSwitchToken}
            options={[
              { label: 'yes', value: 'yes' },
              { label: 'no (just show it)', value: 'no' },
            ]}
          />
        </ApiCard>

        <ApiCard
          step={6}
          title="Leave Company"
          method="POST"
          endpoint="/api/v1/auth/logout"
          description={`Logs out the DELEGATED token (ends that company session row), then restores the stashed personal token even if the logout fails (e.g. 401 access_revoked). ${stashed ? 'A personal token is stashed.' : 'No personal token is stashed.'}`}
          buttonLabel="Leave"
          onSubmit={async () => {
            const personal = getToken(PERSONAL_TOKEN_KEY);
            if (!personal) throw new Error('No stashed personal token. Enter a company with Switch = yes first.');
            try {
              return await authApi.logout();
            } finally {
              setToken(personal);
              removeToken(PERSONAL_TOKEN_KEY);
              refreshSession();
            }
          }}
        />
      </div>
    </div>
  );
}
