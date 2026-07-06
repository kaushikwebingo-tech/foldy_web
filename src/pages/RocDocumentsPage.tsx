import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
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
 * Paste an InstaFinancials InstaDocs / LLPDocs report; the server groups every
 * document into the product's MCA-filing categories (AOC 4, MGT 7, … Other filling).
 */
export default function RocDocumentsPage() {
  const [reportJson, setReportJson] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="ROC Documents"
        subtitle="Categorize an InstaFinancials InstaDocs/LLPDocs report into the MCA filing categories. All 16 categories are returned in order (empty ones included), documents trimmed to name/date/size/link and sorted newest-first."
        icon={<FileStack size={18} />}
        badge="B2B Only"
        postmanSection="roc"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>How it works:</strong> the server reads the report's document list
        (works with either <code>InstaDocs</code> or <code>LLPDocs</code>), matches
        each document's MCA form code from its name (AOC-4, MGT-7/7A, DIR-11/12,
        ADT-1/3, PAS-3, SH-7, INC-22, DPT-3, MGT-14, AOA, MOA, COI) and puts the
        rest under <code>Other filling</code>.
      </div>

      <ApiCard
        title="Categorize Documents"
        method="POST"
        endpoint="/api/v1/b2b/roc/documents/categorize"
        description="Paste the full report JSON below. Large reports (~1MB) are fine — the JSON body limit is raised for this endpoint."
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
  );
}
