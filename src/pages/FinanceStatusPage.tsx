import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { b2bApi } from '@/api/b2bApi';
import { BarChart2 } from 'lucide-react';

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

export default function FinanceStatusPage() {
  const [gstin, setGstin] = useState('');
  const [fy, setFy]       = useState('FY 2024-25');
  const [gstr, setGstr]   = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Finance / GST Return Status"
        subtitle="Track whether GSTR returns have been filed for a given GSTIN and financial year."
        icon={<BarChart2 size={18} />}
        badge="B2B Only"
        postmanSection="gst"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong>Segment guard active:</strong> Requires Business or Enterprise plan.
      </div>

      <div className="space-y-4">
        <ApiCard
          step={1}
          title="Track GST Returns"
          method="POST"
          endpoint="/api/v1/b2b/gst/get-finance-status"
          description="Returns filing status for GSTR-1, GSTR-3B, GSTR-9, etc. for the specified financial year."
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
