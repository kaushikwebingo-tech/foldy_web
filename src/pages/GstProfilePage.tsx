import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { b2bApi } from '@/api/b2bApi';
import { Building2 } from 'lucide-react';

export default function GstProfilePage() {
  const [gstin, setGstin]   = useState('');
  const [title, setTitle]   = useState('');
  const [gstUsername, setGstUsername] = useState('');
  const [profileId, setProfileId] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="GST Profile"
        subtitle="Save multiple GSTINs per Business. Each is verified via WhiteBooks on create; title is your label, type is auto-filled."
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
          description="Verifies the GSTIN via WhiteBooks, then saves the profile with business details auto-filled. title is your own label; type comes from the verification; gstUsername (GST portal username) is stored for the later OTP/returns flow."
          onSubmit={() => b2bApi.createGstProfile(gstin, title, gstUsername)}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <Field label="Title (your label)" value={title} onChange={setTitle} placeholder="e.g. Head Office" />
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
      </div>
    </div>
  );
}
