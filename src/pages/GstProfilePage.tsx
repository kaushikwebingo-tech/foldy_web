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

export default function GstProfilePage() {
  const [gstin, setGstin]   = useState('');
  const [gstUsername, setGstUsername] = useState('');
  const [profileId, setProfileId] = useState('');
  const [sessionOtp, setSessionOtp] = useState('');
  const [summaryType, setSummaryType] = useState('gstr1');
  const [retPeriod, setRetPeriod] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="GST Profile"
        subtitle="Save multiple GSTINs per Business. Each is verified via WhiteBooks on create; the title is auto-built from the business name (first GSTIN = HQ, rest = branches)."
        icon={<Building2 size={18} />}
        badge="B2B Only"
        postmanSection="gst"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong>Segment guard active:</strong> requires an active Business or Enterprise plan. Individual / expired users get 403.
      </div>

      <div className="space-y-4">
        {/* Create profile */}
        <ApiCard
          step={1}
          title="Create GST Profile"
          method="POST"
          endpoint="/api/v1/b2b/gst/profiles"
          description="Verifies the GSTIN via WhiteBooks, then saves the profile with business details auto-filled. The title is auto-built as '<business name> HQ' for the first GSTIN you add and '<business name> BR (<state code>)' for every later one. gstUsername (GST portal username) is stored for the later OTP/returns flow."
          onSubmit={() => b2bApi.createGstProfile(gstin, gstUsername)}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <Field label="GST Portal Username" value={gstUsername} onChange={setGstUsername} placeholder="GST portal login username" />
        </ApiCard>

        {/* List profiles */}
        <ApiCard
          step={2}
          title="List My GST Profiles"
          method="GET"
          endpoint="/api/v1/b2b/gst/profiles"
          description="All GST profiles saved by the logged-in Business."
          onSubmit={() => b2bApi.listGstProfiles()}
        />

        {/* Get one */}
        <ApiCard
          step={3}
          title="Get GST Profile"
          method="GET"
          endpoint="/api/v1/b2b/gst/profiles/:id"
          description="One profile by id (must belong to you)."
          onSubmit={() => b2bApi.getGstProfile(profileId)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="From list response (_id)" fullWidth />
        </ApiCard>

        {/* Delete one */}
        <ApiCard
          step={4}
          title="Delete GST Profile"
          method="DELETE"
          endpoint="/api/v1/b2b/gst/profiles/:id"
          description="Removes a saved GST profile."
          onSubmit={() => b2bApi.deleteGstProfile(profileId)}
          buttonLabel="Delete Profile"
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="From list response (_id)" fullWidth />
        </ApiCard>

        {/* Pure lookup */}
        <ApiCard
          step={5}
          title="Get Business Info by GSTIN (lookup)"
          method="POST"
          endpoint="/api/v1/b2b/gst/get-business-info"
          description="Pure WhiteBooks lookup — returns business name, address, registration status. Does not create a profile."
          onSubmit={() => b2bApi.getBusinessInfo(gstin)}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" fullWidth />
        </ApiCard>

        {/* Divider */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">GST Portal Session (persisted)</p>
          <p className="text-xs text-slate-400 mb-3">Authorise a profile once (OTP) — the 6h token is stored server-side and auto-refreshed for data calls.</p>
        </div>

        {/* Authorise — request OTP */}
        <ApiCard
          step={6}
          title="Authorise — Send OTP"
          method="POST"
          endpoint="/api/v1/b2b/gst/profiles/:id/authorize/otp"
          description="Sends the GST-portal OTP using the profile's stored GST username + GSTIN."
          onSubmit={() => b2bApi.requestGstSessionOtp(profileId)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="From list response (_id)" fullWidth />
        </ApiCard>

        {/* Authorise — verify OTP */}
        <ApiCard
          step={7}
          title="Authorise — Verify OTP"
          method="POST"
          endpoint="/api/v1/b2b/gst/profiles/:id/authorize/verify"
          description="Verifies the OTP and persists the 6h taxpayer token on the profile."
          onSubmit={() => b2bApi.verifyGstSessionOtp(profileId, sessionOtp)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="From list response (_id)" fullWidth />
          <Field label="OTP" value={sessionOtp} onChange={setSessionOtp} placeholder="6-digit OTP" />
        </ApiCard>

        {/* Session status */}
        <ApiCard
          step={8}
          title="Session Status"
          method="GET"
          endpoint="/api/v1/b2b/gst/profiles/:id/session"
          description="Whether the profile is authorised and when the token expires."
          onSubmit={() => b2bApi.getGstSessionStatus(profileId)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="From list response (_id)" fullWidth />
        </ApiCard>

        {/* Profile summary (uses stored token) */}
        <ApiCard
          step={9}
          title="Get Return Summary (stored token)"
          method="POST"
          endpoint="/api/v1/b2b/gst/profiles/:id/summary/:type"
          description="Fetches a return summary using the profile's stored token (auto-refreshed). ret_period is MMYYYY."
          onSubmit={() => b2bApi.getGstProfileSummary(profileId, summaryType, retPeriod)}
        >
          <Field label="Profile ID" value={profileId} onChange={setProfileId} placeholder="From list response (_id)" fullWidth />
          <SelectField label="Type" value={summaryType} onChange={setSummaryType} options={SUMMARY_TYPES} />
          <Field label="Return Period (MMYYYY)" value={retPeriod} onChange={setRetPeriod} placeholder="e.g. 042026" />
        </ApiCard>
      </div>
    </div>
  );
}
