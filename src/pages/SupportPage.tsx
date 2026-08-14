import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { supportApi } from '@/api/supportApi';
import { authApi } from '@/api/authApi';
import { adminApi } from '@/api/adminApi';
import { featureRequestApi } from '@/api/featureRequestApi';
import { LifeBuoy } from 'lucide-react';

// Mirrors FEATURE_REQUEST_OPTIONS on the server. The live list comes from
// "Feature Request Options" below — this just seeds the dropdown.
const FEATURE_TITLE_OPTIONS = [
  { label: 'GST Returns', value: 'gst' },
  { label: 'Income Tax Returns', value: 'itr' },
  { label: 'ROC Filings', value: 'roc' },
  { label: 'TDS Filing', value: 'tds' },
  { label: 'Bank Account Statements', value: 'bank_statements' },
  { label: 'Mutual Funds Portfolio', value: 'mutual_funds' },
  { label: 'Insurance Policies', value: 'insurance' },
  { label: 'Employee Provident Fund (EPF)', value: 'epf' },
  { label: 'Something else', value: 'other' },
];

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
  // user — feature request ("Suggest Feature")
  const [featureTitle, setFeatureTitle] = useState('other');
  const [featureDescription, setFeatureDescription] = useState('');
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

        {/* ── User: Feature Requests ────────────────────────── */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Feature Requests (user)</p>
          <p className="text-xs text-slate-400 mb-3">Backs the app's "Suggest Feature" sheet. The title is a fixed enum — fetch the options first, then submit against one of those values.</p>
        </div>

        <ApiCard
          step={3}
          title="Feature Request Options"
          method="GET"
          endpoint="/api/v1/feature-requests/available"
          description="Allowed titles with labels + blurbs. Drives the app's picker, so a new option here needs no app release."
          onSubmit={() => featureRequestApi.listOptions()}
        />

        <ApiCard
          step={4}
          title="Submit Feature Request"
          method="POST"
          endpoint="/api/v1/feature-requests"
          description="Auto-linked to the logged-in user; starts in status 'pending'. A title outside the enum is rejected with 400."
          buttonLabel="Submit"
          onSubmit={() => featureRequestApi.submit({ title: featureTitle, description: featureDescription })}
        >
          <SelectField label="Title" value={featureTitle} onChange={setFeatureTitle} options={FEATURE_TITLE_OPTIONS} />
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea
              value={featureDescription}
              onChange={(e) => setFeatureDescription(e.target.value)}
              rows={3}
              placeholder="What would you like to see in the app?…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </ApiCard>

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
          step={5}
          title="List All Support Queries"
          method="GET"
          endpoint="/api/admin/v1/support/queries"
          description="All requests across users; filter by status. Copy a query _id for the update step."
          onSubmit={() => adminApi.listSupportQueries(1, 20, status || undefined)}
        >
          <SelectField label="Status filter" value={status} onChange={setStatus} options={STATUS_FILTER} />
        </ApiCard>

        <ApiCard
          step={6}
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

        <ApiCard
          step={7}
          title="List All Feature Requests"
          method="GET"
          endpoint="/api/admin/v1/feature-requests"
          description="Every suggestion submitted from the app, newest first, with the requesting user populated. Read-only — there is no status-update endpoint yet, so all rows stay 'pending'."
          onSubmit={() => featureRequestApi.adminList(1, 20)}
        />
      </div>
    </div>
  );
}
