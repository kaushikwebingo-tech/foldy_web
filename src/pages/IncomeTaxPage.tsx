import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { incomeTaxApi } from '@/api/incomeTaxApi';
import { FileText } from 'lucide-react';

/*
 * Income Tax — a module distinct from TDS. ITR list/details + Form 26AS via
 * AuthBridge, active for BOTH B2C and B2B (requireSegment). Backend:
 * server/src/routes/app/v1/incomeTaxRoutes.ts (/api/v1/income-tax).
 */
export default function IncomeTaxPage() {
  const [fy, setFy] = useState('2024-25');
  const [itrId, setItrId] = useState('');
  const [tdsId, setTdsId] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Income Tax — ITR & Form 26AS"
        subtitle="Taxpayer-side income-tax data via AuthBridge. Link the portal account once, then download the ITR list / Form 26AS (async jobs) and fetch details by id. PAN is taken from the JWT user."
        icon={<FileText size={18} />}
        badge="B2C + B2B"
        postmanSection="income-tax"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Note:</strong> a separate module from TDS. Returns a "not configured" error until the
        AUTHBRIDGE_* env is set on the server.
      </div>

      <div className="space-y-4">
        {/* Portal link */}
        <ApiCard
          title="Portal Link Status"
          method="GET"
          endpoint="/api/v1/income-tax/itr-client/status"
          description="Is the user's income-tax portal account linked / session live?"
          onSubmit={() => incomeTaxApi.getStatus()}
        />

        <ApiCard
          step={1}
          title="Link Portal Account"
          method="POST"
          endpoint="/api/v1/income-tax/itr-client"
          description="Link (or re-authenticate) the income-tax portal account. The body may require portal credentials that are configured server-side."
          onSubmit={() => incomeTaxApi.linkPortalAccount({})}
        />

        {/* ITR */}
        <ApiCard
          step={2}
          title="Download ITR List"
          method="POST"
          endpoint="/api/v1/income-tax/itr/download"
          description="Triggers an ITR-list download (async job) for the linked PAN. Returns id(s) to fetch details with."
          onSubmit={() => incomeTaxApi.downloadItrList({ financialYear: fy })}
        >
          <Field label="Financial Year" value={fy} onChange={setFy} placeholder="2024-25" fullWidth />
        </ApiCard>

        <ApiCard
          title="Get ITR Details"
          method="GET"
          endpoint="/api/v1/income-tax/itr/:itrId"
          description="Fetch a downloaded ITR's parsed details by its id."
          onSubmit={() => incomeTaxApi.getItrDetails(itrId)}
        >
          <Field label="ITR ID" value={itrId} onChange={setItrId} placeholder="From the download response" fullWidth />
        </ApiCard>

        {/* Form 26AS */}
        <ApiCard
          step={3}
          title="Download Form 26AS"
          method="POST"
          endpoint="/api/v1/income-tax/26as/download"
          description="Triggers a Form 26AS download (async job) for the user's PAN. Returns a tdsId to fetch details with."
          onSubmit={() => incomeTaxApi.download26AS({ financialYear: fy })}
        >
          <Field label="Financial Year" value={fy} onChange={setFy} placeholder="2024-25" fullWidth />
        </ApiCard>

        <ApiCard
          title="Get Form 26AS Details"
          method="GET"
          endpoint="/api/v1/income-tax/26as/:tdsId"
          description="Fetch a downloaded Form 26AS's parsed details by its tdsId."
          onSubmit={() => incomeTaxApi.get26ASDetails(tdsId)}
        >
          <Field label="TDS ID" value={tdsId} onChange={setTdsId} placeholder="From the download response" fullWidth />
        </ApiCard>
      </div>
    </div>
  );
}
