import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { b2bApi } from '@/api/b2bApi';
import { Building2 } from 'lucide-react';

const SUMMARY_TYPES = [
  { label: 'GSTR-1',  value: 'gstr1'  },
  { label: 'GSTR-1A', value: 'gstr1a' },
  { label: 'GSTR-3B', value: 'gstr3b' },
  { label: 'GSTR-9',  value: 'gstr9'  },
  { label: 'GSTR-9C', value: 'gstr9c' },
];

const FY_OPTIONS = [
  { label: 'FY 2024-25', value: 'FY 2024-25' },
  { label: 'FY 2023-24', value: 'FY 2023-24' },
  { label: 'FY 2022-23', value: 'FY 2022-23' },
];

const GSTR_OPTIONS = [
  { label: 'All returns', value: '' },
  { label: 'GSTR-1',  value: 'GSTR1' },
  { label: 'GSTR-1A', value: 'GSTR1A' },
  { label: 'GSTR-3B', value: 'GSTR3B' },
  { label: 'GSTR-9',  value: 'GSTR9' },
  { label: 'GSTR-9C', value: 'GSTR9C' },
];

/*
 * Single GST flow (profile-centric): create a profile (GSTIN + portal username) →
 * the server verifies the GSTIN, saves it (auto HQ/BR title) and sends the GST-portal
 * OTP → verify the OTP to authorise (6h taxpayer token stored server-side) → list /
 * delete profiles → fetch a return summary per profile using the stored token.
 */
export default function GstProfilePage() {
  const [gstin, setGstin]   = useState('');
  const [gstUsername, setGstUsername] = useState('');
  const [profileId, setProfileId] = useState('');
  const [sessionOtp, setSessionOtp] = useState('');
  const [summaryType, setSummaryType] = useState('gstr1');
  const [retPeriod, setRetPeriod] = useState('');
  const [fy, setFy]       = useState('FY 2024-25');
  const [gstr, setGstr]   = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="GST"
        subtitle="Save a GSTIN as a profile, authorise it once by OTP, then pull GST return summaries — all keyed off the saved profile. Plus a returns filing-status tracker."
        icon={<Building2 size={18} />}
        badge="B2B Only"
        postmanSection="gst"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong>Segment guard active:</strong> requires an active Business or Enterprise plan. Individual / expired users get 403.
      </div>

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Create Profile (GSTIN + username) → an OTP is sent to the GST-registered mobile → Verify OTP → the profile shows in the list → click a profile to fetch its return summary. The first GSTIN you add becomes <code>HQ</code>, the rest become branches.
      </div>

      <div className="space-y-4">
        {/* 1. Create — verifies GSTIN, saves profile, sends OTP */}
        <ApiCard
          step={1}
          title="Create GST Profile"
          method="POST"
          endpoint="/api/v1/b2b/gst/profiles"
          description="Verifies the GSTIN via WhiteBooks, saves the profile (title auto-built as '<business name> HQ/BR (<state>)'), then sends the GST-portal OTP to the registered mobile. The returned profile _id is auto-filled into the steps below."
          onSubmit={async () => {
            const res = await b2bApi.createGstProfile(gstin, gstUsername);
            const id = res.data?.data?.profile?._id;
            if (id) setProfileId(id);
            return res;
          }}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <Field label="GST Portal Username" value={gstUsername} onChange={setGstUsername} placeholder="GST portal login username" />
        </ApiCard>

        {/* 2. Verify OTP — authorise (stores 6h token) */}
        <ApiCard
          step={2}
          title="Verify OTP (Authorise)"
          method="POST"
          endpoint="/api/v1/b2b/gst/profiles/:id/authorize/verify"
          description="Verifies the OTP sent on create and persists the 6h taxpayer token on the profile (auto-refreshed for data calls)."
          onSubmit={() => b2bApi.verifyGstSessionOtp(profileId, sessionOtp)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="Auto-filled from Create" fullWidth />
          <Field label="OTP" value={sessionOtp} onChange={setSessionOtp} placeholder="6-digit GST-portal OTP" />
        </ApiCard>

        {/* 3. Resend OTP (OTP expires) */}
        <ApiCard
          step={3}
          title="Resend OTP"
          method="POST"
          endpoint="/api/v1/b2b/gst/profiles/:id/authorize/otp"
          description="Re-sends the GST-portal OTP for this profile (the create step already sends the first one)."
          onSubmit={() => b2bApi.requestGstSessionOtp(profileId)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="Auto-filled from Create" fullWidth />
        </ApiCard>

        {/* 4. List */}
        <ApiCard
          step={4}
          title="List My GST Profiles"
          method="GET"
          endpoint="/api/v1/b2b/gst/profiles"
          description="All GST profiles saved by the logged-in Business. Copy a profile _id for the summary / delete steps."
          onSubmit={() => b2bApi.listGstProfiles()}
        />

        {/* 5. Delete */}
        <ApiCard
          step={5}
          title="Delete GST Profile"
          method="DELETE"
          endpoint="/api/v1/b2b/gst/profiles/:id"
          description="Removes a saved GST profile. If the deleted profile was the HQ, the next GSTIN you add becomes the new HQ."
          onSubmit={() => b2bApi.deleteGstProfile(profileId)}
          buttonLabel="Delete Profile"
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="From list response (_id)" fullWidth />
        </ApiCard>

        {/* 6. Session status */}
        <ApiCard
          step={6}
          title="Session Status"
          method="GET"
          endpoint="/api/v1/b2b/gst/profiles/:id/session"
          description="Whether the profile is authorised and when the stored token expires (no token exposed)."
          onSubmit={() => b2bApi.getGstSessionStatus(profileId)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="Auto-filled from Create" fullWidth />
        </ApiCard>

        {/* 7. Return summary (stored token) */}
        <ApiCard
          step={7}
          title="Get Return Summary"
          method="POST"
          endpoint="/api/v1/b2b/gst/profiles/:id/summary/:type"
          description="Fetches a return summary for the profile using its stored token (auto-refreshed). ret_period is MMYYYY."
          onSubmit={() => b2bApi.getGstProfileSummary(profileId, summaryType, retPeriod)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="Auto-filled from Create" fullWidth />
          <SelectField label="Type" value={summaryType} onChange={setSummaryType} options={SUMMARY_TYPES} />
          <Field label="Return Period (MMYYYY)" value={retPeriod} onChange={setRetPeriod} placeholder="e.g. 042026" />
        </ApiCard>

        {/* Divider — filing status (different purpose: tracks whether returns are filed) */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Returns Filing Status</p>
          <p className="text-xs text-slate-400 mb-3">Compliance tracker — which GSTR returns are filed / overdue for a GSTIN + FY. Public track; no profile or OTP needed (distinct from Return Summary above, which fetches a return's contents).</p>
        </div>

        {/* 8. Track returns filing status */}
        <ApiCard
          step={8}
          title="Track GST Returns (filing status)"
          method="POST"
          endpoint="/api/v1/b2b/gst/get-finance-status"
          description="Returns the 12-month filing status (Filed / Overdue / Due) for GSTR-1, GSTR-3B, GSTR-9, etc. for a GSTIN and financial year. Tracks whether returns are filed — not their contents."
          onSubmit={() => b2bApi.trackGstReturns(gstin, fy, gstr || undefined)}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
          <SelectField label="Filter by Return (optional)" value={gstr} onChange={setGstr} options={GSTR_OPTIONS} />
        </ApiCard>
      </div>
    </div>
  );
}
