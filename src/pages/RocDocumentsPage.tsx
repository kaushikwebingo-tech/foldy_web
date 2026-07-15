import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { rocApi } from '@/api/rocApi';
import { FileStack } from 'lucide-react';

const SAMPLE = `{
  "ReportData": {
    "InstaDocs": {
      "Document": [
        {
          "DocumentName": "AOC-4 XBRL Form AOC-4(XBRL).pdf",
          "DocumentCategory": "Annual Returns and Balance Sheet eForms",
          "DocumentFillingDate": "02-11-2024",
          "DocumentSize": 7.76,
          "DocumentLink": "https://downloads.InstaFinancials.com/..."
        },
        {
          "DocumentName": "Form MGT-7.pdf",
          "DocumentFillingDate": "20-09-2023",
          "DocumentSize": 1.2,
          "DocumentLink": "https://downloads.InstaFinancials.com/..."
        },
        {
          "DocumentName": "Form CHG-1.pdf",
          "DocumentFillingDate": "19-02-2026",
          "DocumentSize": 0.4,
          "DocumentLink": "https://downloads.InstaFinancials.com/..."
        }
      ]
    }
  }
}`;

/*
 * ROC/LLP documents (InstaFinancials). Two parts:
 *  1) The job lifecycle: order by identifier → poll our DB → read documents.
 *     Completion normally arrives by webhook, not from anything this page calls.
 *  2) The categorizer, which works offline on any pasted report.
 */
export default function RocDocumentsPage() {
  const [identifier, setIdentifier] = useState('');
  const [jobId, setJobId] = useState('');
  const [category, setCategory] = useState('');
  const [reportJson, setReportJson] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="ROC Documents"
        subtitle="InstaFinancials InstaDocs/LLPDocs — order a company's or LLP's MCA documents from one identifier, track the job, then read the documents grouped into the 16 MCA filing categories."
        icon={<FileStack size={18} />}
        badge="B2B Only"
        postmanSection="roc"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong>Ordering costs money and is rate-limited.</strong> Step 1 hits the live
        InstaFinancials API (needs <code>INSTAFINANCIALS_ROC_API_KEY</code> on the server) and is
        guarded: <strong>one active job per user</strong> (409) and <strong>one order per 90 days</strong>,
        counted from when the job was created (429). Outside production the server serves its sample
        report instead of calling the vendor.
      </div>

      <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
        <strong>Delivery is asynchronous and slow:</strong> ~30 min for LLPDocs, up to ~3 weeks for
        InstaDocs. The report arrives at <code>POST /webhook/instafinancials</code> (the primary
        path), which persists the documents and pushes a notification; a reconciler cron covers a
        missed callback on a budgeted backoff (+2h/+24h/+5d/+14d), because the vendor allows only 4
        status pulls per order. Step 2 never calls the vendor — it reads our DB, so poll it freely.
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Job Lifecycle</p>

        {/* 1. Order documents */}
        <ApiCard
          step={1}
          title="Order Documents"
          method="POST"
          endpoint="/api/v1/b2b/roc/job"
          description="Send ONE identifier — CIN or PAN (→ InstaDocs) or LLPIN (→ LLPDocs). The type is detected from its shape, so there's no separate LLP call. Returns 202 + jobId, auto-filled below."
          buttonLabel="Order Documents"
          onSubmit={async () => {
            const res = await rocApi.createJob(identifier);
            const id = res.data?.data?.jobId;
            if (id) setJobId(String(id));
            return res;
          }}
        >
          <Field
            label="Identifier (CIN / PAN / LLPIN)"
            value={identifier}
            onChange={setIdentifier}
            placeholder="U69202WB2024PTC269500 · AAP-7675 · AAACX1234F"
            fullWidth
          />
        </ApiCard>

        {/* 2. Job status */}
        <ApiCard
          step={2}
          title="Job Status"
          method="GET"
          endpoint="/api/v1/b2b/roc/job"
          description="The current job + cooldown. Reads our DB (0 vendor calls), so it's safe to poll. `canOrder` is the single flag the order button needs; `cooldown.daysRemaining` explains a 429."
          onSubmit={() => rocApi.getJob()}
        />

        {/* 3. Documents */}
        <ApiCard
          step={3}
          title="My Documents"
          method="GET"
          endpoint="/api/v1/b2b/roc/documents"
          description="Documents the webhook delivered, grouped into the 16 MCA categories. Leave Job ID blank for the latest ready job. downloadUrl links are permanent InstaFinancials URLs — we store metadata only, never a file copy."
          onSubmit={() =>
            rocApi.getDocuments({
              ...(jobId ? { jobId } : {}),
              ...(category ? { category } : {}),
            })
          }
        >
          <Field label="Job ID (optional)" value={jobId} onChange={setJobId} placeholder="Auto-filled from Order Documents" />
          <Field label="Category (optional)" value={category} onChange={setCategory} placeholder="e.g. AOC 4" />
        </ApiCard>

        {/* Divider — categorizer */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Categorize</p>
          <p className="text-xs text-slate-400 mb-3">Groups a report's documents by MCA form code (AOC-4, MGT-7/7A, DIR-11/12, ADT-1/3, PAS-3, SH-7, INC-22, DPT-3, MGT-14, AOA, MOA, COI); the rest → <code>Other filling</code>. The webhook applies these same rules when it persists documents; this endpoint exposes them for any pasted report.</p>
        </div>

        {/* 4. Categorize */}
        <ApiCard
          step={4}
          title="Categorize Documents"
          method="POST"
          endpoint="/api/v1/b2b/roc/documents/categorize"
          description="Returns all 16 categories in order (empty ones included), each doc trimmed to name/date/size/link, newest-first. Large reports (~1MB) are fine."
          buttonLabel="Categorize"
          onSubmit={async () => {
            let parsed: unknown;
            try {
              parsed = JSON.parse(reportJson);
            } catch {
              throw new Error('Invalid JSON — paste the raw InstaDocs/LLPDocs report.');
            }
            return rocApi.categorizeDocuments(parsed);
          }}
        >
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-600">
                InstaDocs / LLPDocs report JSON
              </label>
              <button
                type="button"
                onClick={() => setReportJson(SAMPLE)}
                className="text-xs text-[#1A73E8] hover:underline"
              >
                Load sample
              </button>
            </div>
            <textarea
              value={reportJson}
              onChange={(e) => setReportJson(e.target.value)}
              rows={12}
              spellCheck={false}
              placeholder='{ "ReportData": { "InstaDocs": { "Document": [ … ] } } }'
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </ApiCard>
      </div>
    </div>
  );
}
