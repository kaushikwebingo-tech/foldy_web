import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { manualUploadApi } from '@/api/manualUploadApi';
import { UploadCloud } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { label: 'PTAX (Business only)',          value: 'ptax' },
  { label: 'Trade license (Business only)', value: 'trade_license' },
  { label: 'PF / ESI',                      value: 'pf_esi' },
  { label: 'Property papers (storage only)', value: 'property_papers' },
];

const FREQ_OPTIONS = [
  { label: 'Auto / not applicable', value: '' },
  { label: 'Monthly',               value: 'monthly' },
  { label: 'Annual',                value: 'annual' },
];

export default function ManualUploadsPage() {
  const [category, setCategory]         = useState('pf_esi');
  const [frequency, setFrequency]       = useState('');
  const [period, setPeriod]             = useState('');
  const [file, setFile]                 = useState<File | null>(null);
  const [listCategory, setListCategory] = useState('pf_esi');
  const [listPeriod, setListPeriod]     = useState('');
  const [itemId, setItemId]             = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Manual Uploads"
        subtitle="Upload compliance proofs (PTAX, Trade license, PF/ESI) and store documents (Property papers). Files go to S3 — compressed and virus-scanned."
        icon={<UploadCloud size={18} />}
        badge="Auth Required"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong>Flow:</strong> upload → quarantine → (scan) → compress → <code>available</code>. Status stays
        <code> scanning</code>/<code>processing</code> until the worker (<code>npm run worker</code>) promotes it.
        Allowed: PDF, JPG, PNG, DOCX, XLSX (max 5 MB). Filing categories need a period; Property papers do not.
      </div>

      <div className="space-y-4">
        {/* Categories */}
        <ApiCard
          title="List Categories (for my plan)"
          method="GET"
          endpoint="/api/v1/manual-uploads/categories"
          description="Categories visible to the logged-in user's segment, with the frequencies that apply."
          onSubmit={() => manualUploadApi.getCategories()}
        />

        {/* Upload */}
        <ApiCard
          title="Upload Document"
          method="POST"
          endpoint="/api/v1/manual-uploads/:category/upload"
          description="Real multipart upload. Filing categories need period (+ frequency when the category has more than one, e.g. PTAX). Property papers ignore period."
          onSubmit={() =>
            file
              ? manualUploadApi.upload(category, file, period || undefined, frequency || undefined)
              : Promise.reject(new Error('Please choose a file first.'))
          }
        >
          <SelectField label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
          <SelectField label="Frequency" value={frequency} onChange={setFrequency} options={FREQ_OPTIONS} />
          <Field label="Period" value={period} onChange={setPeriod} placeholder="MM-YYYY (monthly) or YYYY-YY (annual)" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">File (PDF/JPG/PNG/DOCX/XLSX, ≤5MB)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-xs file:mr-3 file:rounded file:border-0 file:bg-[#1A73E8] file:px-3 file:py-1.5 file:text-white"
            />
          </div>
        </ApiCard>

        {/* List items */}
        <ApiCard
          title="List My Documents"
          method="GET"
          endpoint="/api/v1/manual-uploads/:category/items"
          description="Lists the logged-in user's uploads for a category (optionally filtered by period)."
          onSubmit={() => manualUploadApi.listItems(listCategory, listPeriod || undefined)}
        >
          <SelectField label="Category" value={listCategory} onChange={setListCategory} options={CATEGORY_OPTIONS} />
          <Field label="Period (optional)" value={listPeriod} onChange={setListPeriod} placeholder="e.g. 04-2026" />
        </ApiCard>

        {/* Download */}
        <ApiCard
          title="Get Download Link"
          method="GET"
          endpoint="/api/v1/manual-uploads/items/:id/download"
          description="Returns a short-lived presigned S3 URL (only when status is available)."
          onSubmit={() => manualUploadApi.download(itemId)}
        >
          <Field label="Document ID" value={itemId} onChange={setItemId} placeholder="ManualUpload _id" fullWidth />
        </ApiCard>

        {/* Delete */}
        <ApiCard
          title="Delete Document"
          method="DELETE"
          endpoint="/api/v1/manual-uploads/items/:id"
          description="Deletes the document from S3 and the database. Irreversible."
          onSubmit={() => manualUploadApi.remove(itemId)}
          buttonLabel="Delete"
        >
          <Field label="Document ID" value={itemId} onChange={setItemId} placeholder="ManualUpload _id" fullWidth />
        </ApiCard>
      </div>
    </div>
  );
}
