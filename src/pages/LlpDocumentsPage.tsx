import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { llpApi } from '@/api/llpApi';
import { rocApi } from '@/api/rocApi';
import { Landmark } from 'lucide-react';

const SAMPLE = `{
  "ReportData": {
    "LLPDocs": {
      "Document": [
        {
          "DocumentName": "Certificate of LLP Incorporation - 20DEC2021.pdf",
          "DocumentCategory": "Certificates",
          "DocumentFillingDate": "20-12-2021",
          "DocumentSize": 0.33,
          "DocumentLink": "https://www.InstaFinancials.com/..."
        },
        {
          "DocumentName": "Form 8 Statement of Account.pdf",
          "DocumentFillingDate": "30-10-2023",
          "DocumentSize": 0.5,
          "DocumentLink": "https://www.InstaFinancials.com/..."
        }
      ]
    }
  }
}`;

/*
 * LLP documents (InstaFinancials LLPDocs).
 *
 * Ordering lives on the ROC page — POST /b2b/roc/job routes an LLPIN to the
 * LLPDocs stack — because the one-active-job and 90-day-cooldown rules span both
 * products and can only be enforced from a single entry point. What's left here
 * is the legacy read-only LlpData and the shared categorizer.
 */
export default function LlpDocumentsPage() {
  const [llpDataId, setLlpDataId] = useState('');
  const [reportJson, setReportJson] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="LLP Documents"
        subtitle="InstaFinancials LLPDocs — legacy LLP records and the shared categorizer. Ordering LLP documents happens on the ROC page: an LLPIN is routed to the LLPDocs stack automatically."
        icon={<Landmark size={18} />}
        badge="B2B Only"
        postmanSection="llp"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>To order LLP documents, use the ROC page.</strong>{' '}
        <code>POST /api/v1/b2b/roc/job</code> detects an LLPIN (e.g. <code>AAP-7675</code>) and
        routes it to LLPDocs. There's no separate LLP order call: one active job per user and one
        order per 90 days apply across <em>both</em> products, so a single guarded entry point is the
        only way to enforce them.
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Legacy Records</p>
        <p className="text-xs text-slate-400 -mt-2">
          Read-only <code>LlpData</code> from the previous order flow. Superseded by ROC › Job Status
          + My Documents; kept so existing records stay reachable.
        </p>

        {/* 1. List records */}
        <ApiCard
          step={1}
          title="My LLP Records"
          method="GET"
          endpoint="/api/v1/b2b/llp/profiles"
          description="Legacy LLP records saved for the logged-in Business."
          onSubmit={() => llpApi.listCompanies()}
        />

        {/* 2. Get one record */}
        <ApiCard
          step={2}
          title="Get LLP Record"
          method="GET"
          endpoint="/api/v1/b2b/llp/profile/:llpDataId"
          description="A single legacy LLP record by its _id (from the list response)."
          onSubmit={() => llpApi.getCompany(llpDataId)}
        >
          <Field label="LLP Data ID" value={llpDataId} onChange={setLlpDataId} placeholder="From My LLP Records (_id)" fullWidth />
        </ApiCard>

        {/* Divider — categorizer */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Categorize</p>
          <p className="text-xs text-slate-400 mb-3">Uses the shared ROC categorizer (<code>/b2b/roc/documents/categorize</code>), which handles both LLPDocs and InstaDocs. LLP forms (Form 3/8/11 etc.) fall under <code>Other filling</code>; COI/MOA/AOA still match.</p>
        </div>

        {/* 3. Categorize */}
        <ApiCard
          step={3}
          title="Categorize Documents"
          method="POST"
          endpoint="/api/v1/b2b/roc/documents/categorize"
          description="Returns all 16 categories in order (empty ones included), each doc trimmed to name/date/size/link, newest-first."
          buttonLabel="Categorize"
          onSubmit={async () => {
            let parsed: unknown;
            try {
              parsed = JSON.parse(reportJson);
            } catch {
              throw new Error('Invalid JSON — paste the raw LLPDocs report.');
            }
            return rocApi.categorizeDocuments(parsed);
          }}
        >
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-600">
                LLPDocs report JSON
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
              placeholder='{ "ReportData": { "LLPDocs": { "Document": [ … ] } } }'
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </ApiCard>
      </div>
    </div>
  );
}
