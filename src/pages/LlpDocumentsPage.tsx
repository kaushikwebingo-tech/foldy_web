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
 * LLP company documents (InstaFinancials LLPDocs). Mirrors the ROC flow, keyed
 * by LLPIN. Reports categorize through the shared ROC categorizer.
 */
export default function LlpDocumentsPage() {
  const [llpin, setLlpin] = useState('');
  const [orderId, setOrderId] = useState('');
  const [llpDataId, setLlpDataId] = useState('');
  const [reportJson, setReportJson] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="LLP Documents"
        subtitle="InstaFinancials LLPDocs — order an LLP's MCA documents (by LLPIN), poll the order, download the report, then categorize it. Mirrors the ROC flow."
        icon={<Landmark size={18} />}
        badge="B2B Only"
        postmanSection="llp"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong>Needs InstaFinancials credentials:</strong> the order/status/download calls hit the live InstaFinancials API and require <code>INSTAFINANCIALS_ROC_API_KEY</code> on the server. The categorizer works offline on any pasted report.
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Order Lifecycle</p>

        {/* 1. Place order */}
        <ApiCard
          step={1}
          title="Place Document Order"
          method="POST"
          endpoint="/api/v1/b2b/llp/profile"
          description="Order the LLPDocs report for an LLP by LLPIN. Returns an orderId, auto-filled into the steps below."
          buttonLabel="Place Order"
          onSubmit={async () => {
            const res = await llpApi.placeOrder(llpin);
            const id = res.data?.data?.orderId;
            if (id) setOrderId(String(id));
            return res;
          }}
        >
          <Field label="LLPIN" value={llpin} onChange={setLlpin} placeholder="AAZ-9378" fullWidth />
        </ApiCard>

        {/* 2. Order status */}
        <ApiCard
          step={2}
          title="Order Status"
          method="GET"
          endpoint="/api/v1/b2b/llp/profile/:orderId/status"
          description="Poll the order until it's ready to download."
          onSubmit={() => llpApi.getOrderStatus(orderId)}
        >
          <Field label="Order ID" value={orderId} onChange={setOrderId} placeholder="Auto-filled from Place Order" fullWidth />
        </ApiCard>

        {/* 3. Download report */}
        <ApiCard
          step={3}
          title="Download Report"
          method="GET"
          endpoint="/api/v1/b2b/llp/profile/:orderId/download"
          description="Fetches the completed report (raw LLPDocs JSON). Copy reportData into the Categorize step."
          onSubmit={() => llpApi.downloadReport(orderId)}
        >
          <Field label="Order ID" value={orderId} onChange={setOrderId} placeholder="Auto-filled from Place Order" fullWidth />
        </ApiCard>

        {/* 4. List records */}
        <ApiCard
          step={4}
          title="My LLP Records"
          method="GET"
          endpoint="/api/v1/b2b/llp/profiles"
          description="All LLP orders/records saved for the logged-in Business."
          onSubmit={() => llpApi.listCompanies()}
        />

        {/* 5. Get one record */}
        <ApiCard
          step={5}
          title="Get LLP Record"
          method="GET"
          endpoint="/api/v1/b2b/llp/profile/:llpDataId"
          description="A single saved LLP record by its _id (from the list response)."
          onSubmit={() => llpApi.getCompany(llpDataId)}
        >
          <Field label="LLP Data ID" value={llpDataId} onChange={setLlpDataId} placeholder="From My LLP Records (_id)" fullWidth />
        </ApiCard>

        {/* Divider — categorizer */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Categorize</p>
          <p className="text-xs text-slate-400 mb-3">Uses the shared ROC categorizer (<code>/b2b/roc/documents/categorize</code>), which handles both LLPDocs and InstaDocs. LLP forms (Form 3/8/11 etc.) fall under <code>Other filling</code>; COI/MOA/AOA still match.</p>
        </div>

        {/* 6. Categorize */}
        <ApiCard
          step={6}
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
