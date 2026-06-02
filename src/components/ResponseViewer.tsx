import { useState } from 'react';
import { CheckCircle, XCircle, Copy, Check } from 'lucide-react';

interface Props {
  data: unknown;
  error?: unknown;
  loading?: boolean;
  title?: string;
}

export default function ResponseViewer({ data, error, loading, title = 'Response' }: Props) {
  const [copied, setCopied] = useState(false);

  const content = error
    ? (error as { response?: { data?: unknown } })?.response?.data ?? error
    : data;

  const isError = !!error;
  const json = content !== undefined ? JSON.stringify(content, null, 2) : null;

  const copy = () => {
    if (!json) return;
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          ) : isError ? (
            <XCircle className="w-4 h-4 text-red-500" />
          ) : json !== null ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : null}
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
          {isError && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Error</span>}
          {!isError && json !== null && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Success</span>}
        </div>
        {json !== null && (
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      {loading && (
        <div className="json-viewer text-slate-400">Waiting for response...</div>
      )}

      {!loading && json !== null && (
        <pre className={`json-viewer ${isError ? 'border-red-200 bg-red-50' : ''}`}>
          {json}
        </pre>
      )}

      {!loading && json === null && (
        <div className="json-viewer text-slate-400">No response yet. Hit the button above.</div>
      )}
    </div>
  );
}
