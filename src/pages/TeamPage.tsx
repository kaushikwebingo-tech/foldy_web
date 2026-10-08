import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { accountApi } from '@/api/accountApi';
import { client } from '@/api/client';
import { getApiOrigin, getToken } from '@/lib/utils';
import { Users } from 'lucide-react';

/*
 * Team & access on a company workspace — the NEW model. Backend:
 * server/src/routes/app/v1/{staffRoutes,teamRoleRoutes,workspaceRoutes,metaRoutes,
 * identityAuthRoutes}.ts, mounted at /api/v1/{team,workspace,meta,auth}.
 *
 * NO INVITATION EXISTS ANYWHERE (decision R21): the admin creates the staff member
 * ACTIVE at once, and the person sets their own password through an EMAILED
 * single-use 72-hour link (R22). There is no claim, no temporary password and no
 * `invited` status, so this page has no card for any of them.
 *
 * FIVE ACTIONS ARE STEP-UP GATED (§8.5, Class B): `team.staff` for suspend,
 * reactivate, remove and setup/resend, `team.staff.role` for the role change. The
 * helper card below mints a token per action and keeps it in page state; each gated
 * card sends the one for its own action as `X-Step-Up`, or no header at all — so the
 * 403 AUTH_STEP_UP_REQUIRED refusal can be seen too. A 401 only ever means "this
 * session is over" (§8.9).
 *
 * Calls go through the console's one axios `client` (bearer from the sidebar token,
 * host from the API Host setting), and the response panel is ApiCard's — nothing here
 * is a second HTTP client. The LEGACY group at the foot drives the pre-RBAC
 * `/account` co-user routes the server still mounts for the legacy JWT.
 */

type StepUpAction = 'team.staff' | 'team.staff.role' | 'team.roles';
type StepUpTokens = Partial<Record<StepUpAction, { token: string; expiresAt?: string }>>;

const STEP_UP_ACTIONS: { label: string; value: StepUpAction }[] = [
  { label: 'team.staff — suspend / reactivate / remove / setup resend (add needs none)', value: 'team.staff' },
  { label: 'team.staff.role — change a staff member\'s role', value: 'team.staff.role' },
  { label: 'team.roles — create / edit / delete a custom role', value: 'team.roles' },
];

const csv = (s: string) => s.split(',').map((p) => p.trim()).filter(Boolean);

function jwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1] ?? '';
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const parsed: unknown = JSON.parse(atob(b64));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** A path segment the user typed, refused locally when blank rather than sent as `//`. */
function need(value: string, label: string): string {
  const v = value.trim();
  if (!v) throw new Error(`Enter the ${label} first.`);
  return encodeURIComponent(v);
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}

export default function TeamPage() {
  // New model: the team
  const [staffId, setStaffId] = useState('');
  const [listLimit, setListLimit] = useState('25');
  const [listCursor, setListCursor] = useState('');
  const [listStatus, setListStatus] = useState('');

  // §4.1's closed body — name, mobile, email (REQUIRED), role, title?
  const [staffName, setStaffName] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRoleId, setStaffRoleId] = useState('');
  const [staffTitle, setStaffTitle] = useState('');

  // §8.5 step-up — one token per action, kept in page state only
  const [stepUpAction, setStepUpAction] = useState<StepUpAction>('team.staff');
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUp, setStepUp] = useState<StepUpTokens>({});

  // §4.4's gated actions
  const [newRoleId, setNewRoleId] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [ackShrink, setAckShrink] = useState(false);

  // §4.2 — the staff member's own half (public)
  const [setupT, setSetupT] = useState('');
  const [setupPassword, setSetupPassword] = useState('');

  // Activity log
  const [area, setArea] = useState('');
  const [actor, setActor] = useState('');
  const [operation, setOperation] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cursor, setCursor] = useState('');
  const [limit, setLimit] = useState('50');

  // LEGACY /account
  const [legacyMemberId, setLegacyMemberId] = useState('');
  const [memberStatus, setMemberStatus] = useState('active');
  const [memberRoleId, setMemberRoleId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  // Starts blank: Update sends permissions whenever this is non-empty and they REPLACE
  // the role's list, so a pre-filled default would silently overwrite it on a rename.
  const [rolePerms, setRolePerms] = useState('');

  const payload = jwtPayload(getToken());
  const newModel = !!payload?.sub && !!payload?.tid;

  /** `X-Step-Up` for one action, or no header at all so the 403 can be seen. */
  const stepUpHeaders = (action: StepUpAction): Record<string, string> => {
    const token = stepUp[action]?.token?.trim();
    return token ? { 'X-Step-Up': token } : {};
  };
  const ack = ackShrink ? { acknowledgeAlertShrink: true } : {};
  const heldFor = (action: StepUpAction) => {
    const held = stepUp[action];
    if (!held?.token) return 'none held — the server will answer 403 AUTH_STEP_UP_REQUIRED';
    return held.expiresAt ? `held, expires ${held.expiresAt}` : 'held (pasted)';
  };
  const setupPageUrl = setupT.trim()
    ? `${getApiOrigin()}/api/v1/auth/setup?t=${encodeURIComponent(setupT.trim())}`
    : '';

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Team & Access"
        subtitle="Staff on the new identity model (§4.1-§4.4): the admin creates a member ACTIVE at once and the person sets their password from an emailed 72-hour link — there is no invitation anywhere (R21, R22). Five actions need an X-Step-Up token (§8.5)."
        icon={<Users size={18} />}
        badge="Auth Required"
        postmanSection="account"
      />

      <div
        className={`mb-4 px-4 py-3 rounded-lg text-xs border ${
          payload && !newModel ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}
      >
        {!payload ? (
          <span><strong>No token.</strong> Sign in on the Identity page first.</span>
        ) : newModel ? (
          <span>
            <strong>New-model session</strong> — person <code>{String(payload.sub)}</code>, workspace{' '}
            <code>{String(payload.tid)}</code>
            {payload.mid ? <>, membership <code>{String(payload.mid)}</code></> : null}. The tenant comes only from
            this session (§8.7 rule 2).
          </span>
        ) : (
          <span>
            <strong>Legacy JWT.</strong> The /team, /workspace, /meta, /account/audit and step-up calls need a new-model session (Identity
            → Sign In); this token only drives the LEGACY group at the foot of the page.
          </span>
        )}
        <span className="block mt-1">
          A <code>401</code> means only that the session is over (§8.9). Every refusal on these routes is 403 / 404 / 409 /
          422 / 429 with an <code>errorCode</code>.
        </span>
      </div>

      <div className="space-y-4">
        {/* ---------- Any member ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">Any member</p>

        <ApiCard
          title="Workspace Access"
          method="GET"
          endpoint="/api/v1/workspace/access"
          description="§7.12's envelope — never gated on a permission: workspace, isOwner, role, permissions[], ownerCapabilities[], modules, seats { used, limit }, owner { name }, plan, accessVersion (the X-Access-Version header) and membersEnabled. Replaces the legacy /account/me/permissions."
          onSubmit={() => client.get('/workspace/access')}
        />

        <ApiCard
          title="Permission Catalog"
          method="GET"
          endpoint="/api/v1/meta/permissions"
          description="§6.4's served vocabulary: { groups: [{ id, title, subtitle, view, permissions: [{ key, label, seat, ownerOnlyToGrant? }] }] }. The console never carries a list of its own."
          onSubmit={() => client.get('/meta/permissions')}
        />

        {/* ---------- The team ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Team · staff</p>

        <ApiCard
          step={1}
          title="List Team Roles"
          method="GET"
          endpoint="/api/v1/team/roles"
          description="team.read or roles.manage. roles[].id is the role Add Staff and Change Role take — the console names no role of its own."
          onSubmit={() => client.get('/team/roles')}
        />

        <ApiCard
          step={2}
          title="List Staff"
          method="GET"
          endpoint="/api/v1/team/staff"
          description="team.read. Keyset-paged: nextCursor from the answer is copied into Cursor, so pressing again fetches the next page (cleared when there is none). limit 1-100; status active | suspended — `invited` does not exist (R21). Rows carry masked contacts, setupPending and the server's own `can` flags. Blank fields are not sent."
          onSubmit={async () => {
            const res = await client.get('/team/staff', {
              params: {
                ...(listLimit.trim() ? { limit: Number(listLimit) } : {}),
                ...(listCursor.trim() ? { cursor: listCursor.trim() } : {}),
                ...(listStatus ? { status: listStatus } : {}),
              },
            });
            const next: unknown = res.data?.data?.nextCursor;
            setListCursor(typeof next === 'string' ? next : '');
            return res;
          }}
        >
          <Field label="Limit" value={listLimit} onChange={setListLimit} placeholder="1-100, default 25" type="number" />
          <SelectField
            label="Status (optional)"
            value={listStatus}
            onChange={setListStatus}
            options={[
              { label: 'any', value: '' },
              { label: 'active', value: 'active' },
              { label: 'suspended', value: 'suspended' },
            ]}
          />
          <Field label="Cursor (optional)" value={listCursor} onChange={setListCursor} placeholder="nextCursor" fullWidth />
        </ApiCard>

        <ApiCard
          step={3}
          title="Read Staff Member"
          method="GET"
          endpoint="/api/v1/team/staff/:id"
          description="team.read. :id is the MEMBERSHIP id (members[].id). Another workspace's id answers 404, never 403 (§8.7 rule 1). Adds addedAt, addedBy, suspendedAt, suspendedBy, suspendReason and the resolved permissions[] to the row."
          onSubmit={() => client.get(`/team/staff/${need(staffId, 'Membership ID')}`)}
        >
          <Field label="Membership ID" value={staffId} onChange={setStaffId} placeholder="members[].id" fullWidth />
        </ApiCard>

        <ApiCard
          step={4}
          title="Add Staff Member"
          method="POST"
          endpoint="/api/v1/team/staff"
          description="team.manage. CLOSED body — unknown keys are 422. Email is REQUIRED: the single-use 72-hour set-password link goes there (R22). The member is active at once. 201 { membershipId, name, role, status: 'active', title?, seats } — byte-identical whether the mobile was already on Foldy or not (§8.2). 409 TEAM_MEMBER_EXISTS, 409 TENANT_SEAT_UNAVAILABLE { limit, used, needed } (nothing written), 403 RBAC_OWNER_ONLY / RBAC_PERMISSION_DENIED for a role you may not assign."
          buttonLabel="Add"
          onSubmit={() =>
            client.post('/team/staff', {
              name: staffName.trim(),
              mobile: staffMobile.trim(),
              email: staffEmail.trim(),
              role: staffRoleId.trim(),
              ...(staffTitle.trim() ? { title: staffTitle.trim() } : {}),
            })
          }
        >
          <Field label="Full name (2-80)" value={staffName} onChange={setStaffName} placeholder="Asha Nair" />
          <Field label="Mobile (Indian)" value={staffMobile} onChange={setStaffMobile} placeholder="9876543210" />
          <Field label="Email (required)" value={staffEmail} onChange={setStaffEmail} placeholder="asha@example.com" type="email" />
          <Field label="Role ID" value={staffRoleId} onChange={setStaffRoleId} placeholder="roles[].id from List Team Roles" />
          <Field label="Title (optional, ≤ 60)" value={staffTitle} onChange={setStaffTitle} placeholder="Accounts — GST" fullWidth />
        </ApiCard>

        {/* ---------- Step-up ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">X-Step-Up helper · §8.5</p>

        <ApiCard
          title="X-Step-Up Helper"
          method="POST"
          endpoint={stepUpCode.trim() ? '/api/v1/auth/step-up/verify' : '/api/v1/auth/step-up/start'}
          description="Leave Code empty and press Send code: the server texts a 6-digit code to the SESSION's own mobile. Then type the code and press Verify: the stepUpToken is stored below for that action (page state only, reusable for 10 minutes — Class B) and the gated cards send it as X-Step-Up. A code is bound to the action it was started for. A wrong code is 422 OTP_INVALID, never 401."
          buttonLabel={stepUpCode.trim() ? 'Verify code' : 'Send code'}
          onSubmit={async () => {
            const code = stepUpCode.trim();
            if (!code) return client.post('/auth/step-up/start', { action: stepUpAction });
            const res = await client.post('/auth/step-up/verify', { action: stepUpAction, code });
            const data = res.data?.data;
            const token: unknown = data?.stepUpToken;
            if (typeof token === 'string' && token) {
              const expiresAt: unknown = data?.expiresAt;
              setStepUp((prev) => ({
                ...prev,
                [stepUpAction]: { token, ...(typeof expiresAt === 'string' ? { expiresAt } : {}) },
              }));
              setStepUpCode('');
            }
            return res;
          }}
        >
          <SelectField
            label="Action"
            value={stepUpAction}
            onChange={(v) => setStepUpAction(v as StepUpAction)}
            options={STEP_UP_ACTIONS}
            fullWidth
          />
          <Field label="Code (empty = send one)" value={stepUpCode} onChange={setStepUpCode} placeholder="123456" />
          <Field
            label={`Token for ${stepUpAction} (stored, or paste one)`}
            value={stepUp[stepUpAction]?.token ?? ''}
            onChange={(v) =>
              setStepUp((prev) => ({ ...prev, [stepUpAction]: { token: v.trim() } }))
            }
            placeholder="stepUpToken"
          />
          <p className="text-xs text-slate-500 sm:col-span-2">
            team.staff: {heldFor('team.staff')} · team.staff.role: {heldFor('team.staff.role')} · team.roles:{' '}
            {heldFor('team.roles')}
          </p>
        </ApiCard>

        {/* ---------- Gated membership actions ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">
          Membership actions · team.manage + X-Step-Up
        </p>

        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Membership ID (all five cards)" value={staffId} onChange={setStaffId} placeholder="members[].id" />
            <Check
              label="acknowledgeAlertShrink — send true (after a 409 TEAM_ALERT_SHRINK_UNCONFIRMED warning was shown)"
              checked={ackShrink}
              onChange={setAckShrink}
            />
          </div>
          <p>
            The refusals the rules produce: 403 RBAC_SENIORITY_DENIED (a non-owner acting on someone holding team.manage or
            roles.manage), 403 RBAC_PERMISSION_DENIED with reason <code>self</code> or <code>owner_membership</code>, 409
            TEAM_ALERT_SHRINK_UNCONFIRMED {'{ modules, person }'} until the change is acknowledged, 429 TEAM_CHURN_LIMIT
            after three suspend/reactivate transitions of one person in 24 hours.
          </p>
        </div>

        <ApiCard
          title="Change Staff Role"
          method="PATCH"
          endpoint="/api/v1/team/staff/:id/role"
          description={`X-Step-Up team.staff.role (${heldFor('team.staff.role')}). Body { role, acknowledgeAlertShrink? }. Lands on their next tap. Free → paid with no seat free is 409 TENANT_SEAT_UNAVAILABLE; the same role again is 422.`}
          buttonLabel="Change Role"
          onSubmit={() =>
            client.patch(
              `/team/staff/${need(staffId, 'Membership ID')}/role`,
              { role: newRoleId.trim(), ...ack },
              { headers: stepUpHeaders('team.staff.role') },
            )
          }
        >
          <Field label="New role ID" value={newRoleId} onChange={setNewRoleId} placeholder="roles[].id" fullWidth />
        </ApiCard>

        <ApiCard
          title="Suspend Staff Member"
          method="POST"
          endpoint="/api/v1/team/staff/:id/suspend"
          description={`X-Step-Up team.staff (${heldFor('team.staff')}). Body { reason? ≤ 200, acknowledgeAlertShrink? }. Frees the seat at once (R18) and ends their sessions in THIS workspace only. Already suspended is 409 MEMBERSHIP_NOT_SUSPENDABLE.`}
          buttonLabel="Suspend"
          onSubmit={() =>
            client.post(
              `/team/staff/${need(staffId, 'Membership ID')}/suspend`,
              { ...(suspendReason.trim() ? { reason: suspendReason.trim() } : {}), ...ack },
              { headers: stepUpHeaders('team.staff') },
            )
          }
        >
          <Field label="Reason (optional, ≤ 200)" value={suspendReason} onChange={setSuspendReason} placeholder="On leave until March" fullWidth />
        </ApiCard>

        <ApiCard
          title="Reactivate Staff Member"
          method="POST"
          endpoint="/api/v1/team/staff/:id/reactivate"
          description={`X-Step-Up team.staff (${heldFor('team.staff')}). No body. Takes a seat again: a full workspace is 409 TENANT_SEAT_UNAVAILABLE { limit, used, needed } and nothing is written. Already active is 409 MEMBERSHIP_NOT_SUSPENDABLE.`}
          buttonLabel="Reactivate"
          onSubmit={() =>
            client.post(`/team/staff/${need(staffId, 'Membership ID')}/reactivate`, undefined, {
              headers: stepUpHeaders('team.staff'),
            })
          }
        />

        <ApiCard
          title="Remove Staff Member"
          method="DELETE"
          endpoint="/api/v1/team/staff/:id"
          description={`X-Step-Up team.staff (${heldFor('team.staff')}). Optional body { acknowledgeAlertShrink }. Hard-deletes the membership, ends their sessions here, voids this workspace's contact-change proposal and frees the seat; their person, username, device trust and other workspaces are untouched. 200 with status 'removed' and the seat numbers.`}
          buttonLabel="Remove"
          onSubmit={() =>
            client.delete(`/team/staff/${need(staffId, 'Membership ID')}`, {
              headers: stepUpHeaders('team.staff'),
              ...(ackShrink ? { data: ack } : {}),
            })
          }
        />

        <ApiCard
          title="Resend Set-Password Email"
          method="POST"
          endpoint="/api/v1/team/staff/:id/setup/resend"
          description={`X-Step-Up team.staff (${heldFor('team.staff')}). No body. Only while setupPending and only for the workspace that created the person (row.can.resendSetup) — otherwise 403 RBAC_NOT_MANAGED_PERSON. 429 OTP_SEND_LIMIT within 60 s or after 3 sends in one 72-hour window. Answers { sentTo (masked), expiresAt, sends { used, limit }, resendIn } and never the link.`}
          buttonLabel="Resend"
          onSubmit={() =>
            client.post(`/team/staff/${need(staffId, 'Membership ID')}/setup/resend`, undefined, {
              headers: stepUpHeaders('team.staff'),
            })
          }
        />

        {/* ---------- The staff member's own half ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">Staff member · the emailed link (public)</p>

        <ApiCard
          title="Complete Setup (first password)"
          method="POST"
          endpoint="/api/v1/auth/setup/complete"
          description="PUBLIC. What the page GET /api/v1/auth/setup?t= (server-rendered HTML, not JSON) posts. t = <membershipId>.<secret> as the link carried it. Password policy is signup's (≥ 10 characters; 422 AUTH_WEAK_PASSWORD). Any bad link is one 422 AUTH_TICKET_INVALID. Mints NO session: 200 { next: 'done', message }, then they sign in on /auth/login."
          buttonLabel="Set Password"
          onSubmit={() => client.post('/auth/setup/complete', { t: setupT.trim(), password: setupPassword })}
        >
          <Field label="t (from the emailed link)" value={setupT} onChange={setSetupT} placeholder="<membershipId>.<secret>" fullWidth />
          <Field label="New password" value={setupPassword} onChange={setSetupPassword} placeholder="at least 10 characters" type="password" />
          {setupPageUrl ? (
            <a
              href={setupPageUrl}
              target="_blank"
              rel="noreferrer"
              className="self-end text-xs font-semibold text-[#1A73E8] hover:underline"
            >
              Open the set-password page ↗
            </a>
          ) : null}
        </ApiCard>

        <ApiCard
          title="Activity Log"
          method="GET"
          endpoint="/api/v1/account/audit"
          description="NEW-model session (personAuth: sub/tid/mid — a legacy JWT gets 401), permission audit.read (auditRoutes on secured()). Newest first; paste nextCursor into Cursor for the next page. Dates: ISO or YYYY-MM-DD (IST whole day). Blank fields are not sent (unknown keys are refused)."
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
          <Field label="Actor person id (optional)" value={actor} onChange={setActor} placeholder="24-hex Person id" />
          <Field label="Limit" value={limit} onChange={setLimit} placeholder="1-100" type="number" />
          <Field label="From (optional)" value={from} onChange={setFrom} placeholder="2026-09-01" />
          <Field label="To (optional)" value={to} onChange={setTo} placeholder="2026-09-17" />
          <Field label="Cursor (optional)" value={cursor} onChange={setCursor} placeholder="nextCursor" fullWidth />
        </ApiCard>

        {/* ---------- LEGACY /account ---------- */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4">
          LEGACY · /account co-user API (pre-RBAC JWT)
        </p>

        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <strong>Still mounted, superseded.</strong> <code>accountMemberRoutes</code> keeps these on the legacy{' '}
          <code>businessAuth</code> JWT until §12 retires it; the cards above are the new model. The{' '}
          <code>/account/memberships</code> family (create, my memberships, enter, leave) and every invitation and claim
          card are gone from the console (R21).
        </div>

        <ApiCard
          title="LEGACY — List Members"
          method="GET"
          endpoint="/api/v1/account/members"
          description="Owner session only. { members[] } — members[].id is the legacy membership id used below."
          onSubmit={() => accountApi.listMembers()}
        />

        <ApiCard
          title="LEGACY — Suspend / Re-activate"
          method="PATCH"
          endpoint="/api/v1/account/members/:id"
          description="Owner session. status active | suspended."
          buttonLabel="Set Status"
          onSubmit={() => accountApi.setMemberStatus(need(legacyMemberId, 'legacy membership ID'), memberStatus as 'active' | 'suspended')}
        >
          <Field label="Legacy membership ID" value={legacyMemberId} onChange={setLegacyMemberId} placeholder="members[].id" />
          <SelectField
            label="Status"
            value={memberStatus}
            onChange={setMemberStatus}
            options={[
              { label: 'active (re-activate)', value: 'active' },
              { label: 'suspended', value: 'suspended' },
            ]}
          />
        </ApiCard>

        <ApiCard
          title="LEGACY — Change Member Role"
          method="PATCH"
          endpoint="/api/v1/account/members/:id/role"
          description="Owner session. Body { roleId }."
          buttonLabel="Change Role"
          onSubmit={() => accountApi.changeMemberRole(need(legacyMemberId, 'legacy membership ID'), memberRoleId.trim())}
        >
          <Field label="Legacy membership ID" value={legacyMemberId} onChange={setLegacyMemberId} placeholder="members[].id" />
          <Field label="Role ID" value={memberRoleId} onChange={setMemberRoleId} placeholder="from LEGACY — List Roles" />
        </ApiCard>

        <ApiCard
          title="LEGACY — Remove Member"
          method="DELETE"
          endpoint="/api/v1/account/members/:id"
          description="Owner session. 200 { removed: true }."
          buttonLabel="Remove"
          onSubmit={() => accountApi.removeMember(need(legacyMemberId, 'legacy membership ID'))}
        >
          <Field label="Legacy membership ID" value={legacyMemberId} onChange={setLegacyMemberId} placeholder="members[].id" fullWidth />
        </ApiCard>

        <ApiCard
          title="LEGACY — List Roles"
          method="GET"
          endpoint="/api/v1/account/roles"
          description="The legacy role list; the new model is List Team Roles above."
          onSubmit={() => accountApi.listRoles()}
        />

        <ApiCard
          title="LEGACY — Create Custom Role"
          method="POST"
          endpoint="/api/v1/account/roles"
          description="Permissions comma-separated, from the vocabulary GET /v1/meta/permissions serves (Permission Catalog above). The new model's role writes are /team/roles with X-Step-Up team.roles."
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
          title="LEGACY — Update Custom Role"
          method="PATCH"
          endpoint="/api/v1/account/roles/:id"
          description="Reuses the Create fields — only non-empty ones are sent. A filled Permissions field REPLACES the whole list."
          buttonLabel="Update"
          onSubmit={() =>
            accountApi.updateRole(need(roleId, 'role ID'), {
              ...(roleName.trim() ? { name: roleName.trim() } : {}),
              ...(roleDesc ? { description: roleDesc } : {}),
              ...(rolePerms.trim() ? { permissions: csv(rolePerms) } : {}),
            })
          }
        >
          <Field label="Role ID" value={roleId} onChange={setRoleId} placeholder="roles[].id" fullWidth />
        </ApiCard>

        <ApiCard
          title="LEGACY — Delete Custom Role"
          method="DELETE"
          endpoint="/api/v1/account/roles/:id"
          description="Refused 409 MEMBER_ROLE_IN_USE while any membership holds it."
          buttonLabel="Delete"
          onSubmit={() => accountApi.deleteRole(need(roleId, 'role ID'))}
        >
          <Field label="Role ID" value={roleId} onChange={setRoleId} placeholder="roles[].id" fullWidth />
        </ApiCard>

        <ApiCard
          title="LEGACY — Me Permissions"
          method="GET"
          endpoint="/api/v1/account/me/permissions"
          description="The legacy permission read. GET /v1/workspace/access (Workspace Access above) is built and replaces it."
          onSubmit={() => accountApi.myPermissions()}
        />
      </div>
    </div>
  );
}
