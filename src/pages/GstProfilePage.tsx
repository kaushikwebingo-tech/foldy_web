import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { b2bApi } from '@/api/b2bApi';
import { Building2 } from 'lucide-react';

export default function GstProfilePage() {
  const [gstin, setGstin] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="GST Profile"
        subtitle="Fetch public business registration details for any GSTIN via Sandbox API."
        icon={<Building2 size={18} />}
        badge="B2B Only"
        postmanSection="gst"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong>Segment guard active:</strong> This route requires Business or Enterprise plan. Individual plan users will receive 403.
      </div>

      <div className="space-y-4">
        <ApiCard
          step={1}
          title="Get Business Info by GSTIN"
          method="POST"
          endpoint="/api/v1/b2b/gst/get-business-info"
          description="Returns the business name, address, registration status, and filing details for a GSTIN."
          onSubmit={() => b2bApi.getBusinessInfo(gstin)}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" fullWidth />
        </ApiCard>
      </div>
    </div>
  );
}
