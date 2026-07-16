import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { supportApi } from '@/api/supportApi';
import { authApi } from '@/api/authApi';
import { adminApi } from '@/api/adminApi';
import { LifeBuoy } from 'lucide-react';

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const STATUS_FILTER = [{ label: 'All statuses', value: '' }, ...STATUS_OPTIONS];

/*
 * Contact Support (common to B2B + B2C) + Delete Account, plus the admin-side
 * triage endpoints. User cards use the app JWT; admin cards use the admin JWT
 * (log in on the Admin Panel page first).
 */
export default function SupportPage() {
  // user — create
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [description, setDescription] = useState('');
  // admin — list + update
  const [status, setStatus] = useState('');
  const [queryId, setQueryId] = useState('');
  const [newStatus, setNewStatus] = useState('in_progress');
  const [response, setResponse] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Support & Account"
        subtitle="Contact Support (raise a request + track its status), Delete Account, and the admin-side triage. Common to both B2B and B2C — no segment gate."
        icon={<LifeBuoy size={18} />}
        postmanSection="support"
      />

      <div className="space-y-4">
        {/* ── User: Contact Support ─────────────────────────── */}
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Contact Support (user)</p>

        <ApiCard
          step={1}
          title="Raise a Support Request"
          method="POST"
          endpoint="/api/v1/support/queries"
          description="Submits a query (name, email, mobile, description). Auto-linked to the logged-in user; starts in status 'open'."
          buttonLabel="Submit"
          onSubmit={() => supportApi.createQuery({ name, email, mobile, description })}
        >
          <Field label="Name" value={name} onChange={setName} placeholder="Full name" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Mobile" value={mobile} onChange={setMobile} placeholder="9876543210" />
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe your issue…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </ApiCard>

        <ApiCard
          step={2}
          title="My Support Requests"
          method="GET"
          endpoint="/api/v1/support/queries"
          description="The logged-in user's own requests with current status + any admin reply."
          onSubmit={() => supportApi.listMyQueries()}
        />

        {/* ── Delete Account ───────────────────────────────── */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-1">Danger Zone</p>
          <p className="text-xs text-slate-400 mb-3">Soft-deletes the account: revokes sessions, cancels the subscription, and frees the phone/email/PAN for future re-registration. The record is retained for compliance.</p>
        </div>

        <ApiCard
          title="Delete My Account"
          method="DELETE"
          endpoint="/api/v1/user/account"
          description="Irreversible from the app. Immediately signs the user out (current token revoked)."
          buttonLabel="Delete Account"
          onSubmit={() => authApi.deleteAccount()}
        />

        {/* ── Admin: triage ────────────────────────────────── */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Support Triage (admin)</p>
          <p className="text-xs text-slate-400 mb-3">Uses the admin JWT — log in on the Admin Panel page first.</p>
        </div>

        <ApiCard
          step={3}
          title="List All Support Queries"
          method="GET"
          endpoint="/api/admin/v1/support/queries"
          description="All requests across users; filter by status. Copy a query _id for the update step."
          onSubmit={() => adminApi.listSupportQueries(1, 20, status || undefined)}
        >
          <SelectField label="Status filter" value={status} onChange={setStatus} options={STATUS_FILTER} />
        </ApiCard>

        <ApiCard
          step={4}
          title="Update Query Status"
          method="PATCH"
          endpoint="/api/admin/v1/support/queries/:id/status"
          description="Move the request through the workflow (open → in_progress → resolved → closed) and optionally attach a reply the user will see."
          buttonLabel="Update"
          onSubmit={() => adminApi.updateSupportQueryStatus(queryId, newStatus, response || undefined)}
        >
          <Field label="Query ID" value={queryId} onChange={setQueryId} placeholder="From the list response (_id)" fullWidth />
          <SelectField label="New Status" value={newStatus} onChange={setNewStatus} options={STATUS_OPTIONS} />
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Response (optional)</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="Reply shown to the user…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </ApiCard>
      </div>
    </div>
  );
}
