import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { accountApi } from '@/api/accountApi';
import { authApi } from '@/api/authApi';
import { getToken, setToken, removeToken } from '@/lib/utils';
import { Users } from 'lucide-react';

/*
 * Team & access on a company workspace. Backend:
 * server/src/routes/app/v1/{accountMemberRoutes,accountAuditRoutes}.ts
 * (/api/v1/account) — the routes AS THEY STAND, which RBAC_MASTER_PLAN.md §11.3
 * phase 5 is in the middle of rewriting.
 *
 * WHAT IS ALREADY TRUE AND DRIVEN HERE: the invitation family is deleted, so the
 * admin CREATES the member (§4.1) and there is no claim, decline or cancel on this
 * page. WHAT IS NOT BUILT YET, and therefore has no card: the served permission
 * catalog (GET /v1/meta/permissions, §6.4), the access envelope
 * (GET /v1/workspace/access, §7.12) and the invite claim (§4.2). Those are listed
 * in `identityApi.routeExpectations` rather than called, so a half-built server
 * cannot turn this page into a wall of 404s.
 *
 * NEITHER THE ROLE LIST NOR THE PERMISSION LIST IS HARDCODED HERE. Roles come from
 * List Roles and permissions are typed against what the server serves — that is the
 * whole point of a served catalog (§6.4), and it is why this page names no role and
 * no permission of its own.
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

  // Owner: staff (§4.1's four fields — full name, mobile, email optional, role)
  const [staffName, setStaffName] = useState('');
  const [phoneno, setPhoneno] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRoleId, setStaffRoleId] = useState('');
  const [staffTitle, setStaffTitle] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [memberStatus, setMemberStatus] = useState('active');
  const [memberRoleId, setMemberRoleId] = useState('');

  // Owner: roles
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  // Starts blank: Update sends permissions whenever this is non-empty and they REPLACE
  // the role's list, so a pre-filled default would silently overwrite it on a rename.
  const [rolePerms, setRolePerms] = useState('');

  // Member (personal session)
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
        title="Team & Access"
        subtitle="The admin creates staff outright (§4.1) — no invitations. Member administration is owner-only today; memberships belong to the member's own personal session. Mid-rebuild: §11.3 phase 5 moves this onto memberships + tenant_roles."
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
          The server flag <code>MEMBERS_ENABLED</code> is off by default: create, role change, role
          create/update/delete and enter then answer <code>404 NOT_FOUND</code>. Read it with Me — Permissions.
          A <code>404</code> here is the flag, not a missing route.
        </span>
      </div>

      <div className="space-y-4">
        {/* ---------- Any session ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">Any session</p>

        <ApiCard
          title="Me — Permissions"
          method="GET"
          endpoint="/api/v1/account/me/permissions"
          description="{ isOwner, accountName, roleName, permissions[], membersEnabled }. A non-delegated session gets isOwner true and every permission. §7.12 replaces this with GET /v1/workspace/access, whose envelope also carries ownerOnly and the X-Access-Version a role change bumps — not built yet, so this is still the answer. §6.4 cuts the vocabulary from 41 names to 26."
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
          description="Owner session only. members[].id is the MEMBERSHIP id used below. `pendingInvites` still appears in the envelope and is now always empty — the invite collection is deleted; §4.3 shows a created-but-unclaimed person as an `invited` ROW in members instead. Seeds the system roles and the owner row on first call."
          onSubmit={() => accountApi.listMembers()}
        />

        <ApiCard
          step={2}
          title="Create Staff Member"
          method="POST"
          endpoint="/api/v1/account/memberships"
          description="§4.1's add-staff screen — the admin CREATES the member; there is no invitation any more. Four fields: full name, mobile, email (optional) and the role. No PAN box and no username box: §4.5 mints the handle, it is never typed. Mounted on `memberships` because that prefix is already OWNER_ONLY in MEMBER_ROUTE_POLICY. Over the plan's seats → 409 TENANT_SEAT_UNAVAILABLE with the numbers, which is §4.7's ONE prompt behind all five refusals."
          buttonLabel="Create"
          onSubmit={() =>
            accountApi.createMember({
              name: staffName.trim(),
              mobile: phoneno.trim(),
              role: staffRoleId.trim(),
              ...(staffEmail.trim() ? { email: staffEmail.trim() } : {}),
              ...(staffTitle.trim() ? { title: staffTitle.trim() } : {}),
            })
          }
        >
          <Field label="Full name" value={staffName} onChange={setStaffName} placeholder="Asha Nair" />
          <Field label="Mobile" value={phoneno} onChange={setPhoneno} placeholder="9876543210" />
          <Field label="Email (optional)" value={staffEmail} onChange={setStaffEmail} placeholder="asha@example.com" />
          <Field label="Role ID" value={staffRoleId} onChange={setStaffRoleId} placeholder="from List Roles" />
          <Field label="Title (optional, ≤ 80)" value={staffTitle} onChange={setStaffTitle} placeholder="Accounts — GST" fullWidth />
        </ApiCard>

        <ApiCard
          step={3}
          title="Approve / Suspend / Re-activate"
          method="PATCH"
          endpoint="/api/v1/account/members/:id"
          description="§7.3 statuses are invited | active | suspended — `pending_approval` is gone, and removal hard-deletes, so there is no `removed`. §7.10 decision R18: suspending FREES a seat immediately, so reactivating CONSUMES one and can be refused 409 TENANT_SEAT_UNAVAILABLE on a full plan. Only an `active` membership may be suspended (an `invited` one is refused 409 MEMBERSHIP_NOT_SUSPENDABLE). §6.3: a non-owner may not touch anybody holding team.manage or roles.manage — 403 RBAC_SENIORITY_DENIED."
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
          description="Applies on the member's NEXT TAP (§6.3), not their next login — the app invalidates on an X-Access-Version mismatch. §7.10: crossing the free/paid seat line moves a seat (Viewer and Accountant are free, Administrator and Clerk are paid, a custom role is paid unless read-only), and a change needing a seat with none free is refused BEFORE anything is written. Only the owner may assign a role carrying team.manage or roles.manage."
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
          description="Ends every session they hold on the company, removes their links, handset rows and Cabinet PIN, then deletes the membership. Their uploads stay, and so does their attribution: §7.8 denormalises the actor name and masked mobile into the audit row at write time, so the trail survives removal."
          buttonLabel="Remove"
          onSubmit={() => accountApi.removeMember(membershipId.trim())}
        >
          <Field label="Membership ID" value={membershipId} onChange={setMembershipId} placeholder="members[].id" fullWidth />
        </ApiCard>

        {/* ---------- Owner: roles ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Owner · roles</p>

        <ApiCard
          title="List Roles"
          method="GET"
          endpoint="/api/v1/account/roles"
          description="The four system roles resolve from CODE on every request and cannot be edited; custom roles are per workspace. §6.1 names them Administrator (stored key `administration`), Accountant, Clerk and Viewer — read them from this response, never from a list in the console. §7.10: Administrator and Clerk consume a seat and Accountant and Viewer consume none, whatever their permissions."
          onSubmit={() => accountApi.listRoles()}
        />

        <ApiCard
          title="Create Custom Role"
          method="POST"
          endpoint="/api/v1/account/roles"
          description="Permissions comma-separated, from the vocabulary THE SERVER SERVES — §6.4 cuts it to 26 names (gst|roc|tds|itr|investment each × read/refresh/manage, vault.read/upload/delete, reports.read/export, billing.read, team.read/manage, roles.manage, audit.read, support.use). §6.3: the RESULTING set must be a subset of what you hold, and only the OWNER may create or edit a role carrying team.manage or roles.manage — that lock is what stops the everything-role being cloned under another name. A role holding none of *.refresh, vault.upload, *.manage, vault.delete or reports.export is read-only and costs no seat. 201 on success."
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
          description="Reuses the Create fields — only non-empty ones are sent (so a description cannot be cleared from here). A filled Permissions field REPLACES the whole list. System roles → 403 MEMBER_ROLE_IMMUTABLE. §6.3 applies the subset rule to the RESULTING set on EDIT as well as on create: stated as the creator’s own grant it covered creation and left editing open, which is the whole attack. §7.10: an edit that turns a free role paid recounts every holder in ONE reservation and is refused 409 before any permission change is persisted."
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
          description="Refused (409 MEMBER_ROLE_IN_USE) while any membership holds it — §6.3 reports the count, so the refusal reads ‘N people use this role. Move them first.’"
          buttonLabel="Delete"
          onSubmit={() => accountApi.deleteRole(roleId.trim())}
        >
          <Field label="Role ID" value={roleId} onChange={setRoleId} placeholder="roles[].id" fullWidth />
        </ApiCard>

        {/* ---------- Director: personal session ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Director · personal session</p>

        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <strong>The invitation family is gone, not missing.</strong> My Invitations, Claim and Decline drove{' '}
          <code>/account/invitations*</code>, which §11.2 deletes with <code>AccountInvite</code> and its sweep cron.
          §4.2 replaces them: the admin creates the member above, the person claims it with an 8-character one-time
          password on a <em>sign-in-side</em> screen, and nothing in a team panel ever holds that password. That claim route
          is Phase 5's server work — it does not exist yet, so no card here pretends to call it.
        </div>

        <ApiCard
          step={1}
          title="My Memberships"
          method="GET"
          endpoint="/api/v1/account/memberships"
          description="Companies this account belongs to, every status. Only active rows can be entered. §5.4 replaces this with GET /v1/auth/workspaces, which also LISTS a workspace whose plan has lapsed, badged ‘Payment due’, and opens it read-only rather than hiding it (decision R6)."
          onSubmit={() => accountApi.listMemberships()}
        />

        <ApiCard
          step={2}
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
          step={3}
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

        <ApiCard
          step={4}
          title="Leave Membership (give up my own access)"
          method="POST"
          endpoint="/api/v1/account/memberships/:id/leave"
          description="A server route the console never reached. Leaving is the MEMBER's own decision, taken from their own personal session — not the owner removing them, which is Remove Member above. Send the membership id from My Memberships."
          buttonLabel="Leave"
          onSubmit={() => accountApi.leaveMembership(membershipId.trim())}
        >
          <Field label="Membership ID" value={membershipId} onChange={setMembershipId} placeholder="memberships[].id" fullWidth />
        </ApiCard>
      </div>
    </div>
  );
}
