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
 * ROC company documents (InstaFinancials InstaDocs). Two parts:
 *  1) Order lifecycle: place an order (CIN/PAN) → poll status → download report.
 *  2) Categorize a report into the MCA filing categories.
 */
export default function RocDocumentsPage() {
  const [cin, setCin] = useState('');
  const [pan, setPan] = useState('');
  const [orderId, setOrderId] = useState('');
  const [rocDataId, setRocDataId] = useState('');
  const [reportJson, setReportJson] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="ROC Documents"
        subtitle="InstaFinancials InstaDocs — order a company's MCA documents (by CIN/PAN), poll the order, download the report, then categorize it into the 16 MCA filing categories."
        icon={<FileStack size={18} />}
        badge="B2B Only"
        postmanSection="roc"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong>Needs InstaFinancials credentials:</strong> the order/status/download calls hit the live InstaFinancials API and require <code>INSTAFINANCIALS_ROC_API_KEY</code> set on the server. The categorizer works offline on any pasted report.
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Order Lifecycle</p>

        {/* 1. Place order */}
        <ApiCard
          step={1}
          title="Place Document Order"
          method="POST"
          endpoint="/api/v1/b2b/roc/profile"
          description="Order the InstaDocs report for a company by CIN (or PAN). Returns an orderId, auto-filled into the steps below."
          buttonLabel="Place Order"
          onSubmit={async () => {
            const res = await rocApi.placeOrder({ cin: cin || undefined, pan: pan || undefined });
            const id = res.data?.data?.orderId;
            if (id) setOrderId(String(id));
            return res;
          }}
        >
          <Field label="CIN" value={cin} onChange={setCin} placeholder="L23209TG1989PLC010336" />
          <Field label="PAN (if no CIN)" value={pan} onChange={setPan} placeholder="AAZ-9378 / ABCDE1234F" />
        </ApiCard>

        {/* 2. Order status */}
        <ApiCard
          step={2}
          title="Order Status"
          method="GET"
          endpoint="/api/v1/b2b/roc/profile/:orderId/status"
          description="Poll the order until it's ready to download."
          onSubmit={() => rocApi.getOrderStatus(orderId)}
        >
          <Field label="Order ID" value={orderId} onChange={setOrderId} placeholder="Auto-filled from Place Order" fullWidth />
        </ApiCard>

        {/* 3. Download report */}
        <ApiCard
          step={3}
          title="Download Report"
          method="GET"
          endpoint="/api/v1/b2b/roc/profile/:orderId/download"
          description="Fetches the completed report (raw InstaDocs/LLPDocs JSON). Copy reportData into the Categorize step."
          onSubmit={() => rocApi.downloadReport(orderId)}
        >
          <Field label="Order ID" value={orderId} onChange={setOrderId} placeholder="Auto-filled from Place Order" fullWidth />
        </ApiCard>

        {/* 4. List records */}
        <ApiCard
          step={4}
          title="My ROC Records"
          method="GET"
          endpoint="/api/v1/b2b/roc/profiles"
          description="All ROC orders/records saved for the logged-in Business."
          onSubmit={() => rocApi.listCompanies()}
        />

        {/* 5. Get one record */}
        <ApiCard
          step={5}
          title="Get ROC Record"
          method="GET"
          endpoint="/api/v1/b2b/roc/profile/:rocDataId"
          description="A single saved ROC record by its _id (from the list response)."
          onSubmit={() => rocApi.getCompany(rocDataId)}
        >
          <Field label="ROC Data ID" value={rocDataId} onChange={setRocDataId} placeholder="From My ROC Records (_id)" fullWidth />
        </ApiCard>

        {/* Divider — categorizer */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Categorize</p>
          <p className="text-xs text-slate-400 mb-3">Groups a report's documents by MCA form code (AOC-4, MGT-7/7A, DIR-11/12, ADT-1/3, PAS-3, SH-7, INC-22, DPT-3, MGT-14, AOA, MOA, COI); the rest → <code>Other filling</code>. Paste the <code>reportData</code> from Download Report, or any report JSON.</p>
        </div>

        {/* 6. Categorize */}
        <ApiCard
          step={6}
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
