import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Copy, Check } from 'lucide-react';

interface Props {
  data: unknown;
  error?: unknown;
  loading?: boolean;
  title?: string;
}

export default function ResponseViewer({ data, error, loading, title = 'Response' }: Props) {
  const [copied, setCopied] = useState(false);

  const resp = (error as { response?: { status?: number; data?: unknown } })?.response;
  const status = resp?.status;
  const message = (error as { message?: string })?.message;

  // Classify the failure so a removed/renamed route reads as "expected", not a crash.
  const routeMissing = !!error && status === 404;
  const noResponse = !!error && !resp; // network error / server down / wrong host
  const isHardError = !!error && !routeMissing && !noResponse;

  const content = error ? (resp?.data ?? message ?? error) : data;
  const json =
    content !== undefined
      ? typeof content === 'string'
        ? content
        : JSON.stringify(content, null, 2)
      : null;

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
          ) : routeMissing || noResponse ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          ) : isHardError ? (
            <XCircle className="w-4 h-4 text-red-500" />
          ) : json !== null ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : null}

          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</span>

          {routeMissing && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Route missing · 404
            </span>
          )}
          {noResponse && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              No response
            </span>
          )}
          {isHardError && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              Error{status ? ` · ${status}` : ''}
            </span>
          )}
          {!error && json !== null && (
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Success</span>
          )}
        </div>

        {json !== null && !routeMissing && !noResponse && (
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      {loading && <div className="json-viewer text-slate-400">Waiting for response...</div>}

      {/* Removed / renamed route — calm, explanatory, not a "crash". */}
      {!loading && routeMissing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Route not found (404).</strong> This endpoint may have been removed or renamed on the
          API. The web console card is just out of sync — update or delete it. (Endpoint:{' '}
          <code className="bg-amber-100 px-1 rounded">{message || 'request failed'}</code>)
        </div>
      )}

      {/* No response at all — server down or wrong host. */}
      {!loading && noResponse && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>No response from the server.</strong> Check the <em>API Host</em> in the sidebar and that
          the backend is running. {message && <span className="text-amber-700">({message})</span>}
        </div>
      )}

      {/* Real error response (4xx/5xx with a body) or a successful response. */}
      {!loading && !routeMissing && !noResponse && json !== null && (
        <pre className={`json-viewer ${isHardError ? 'border-red-200 bg-red-50' : ''}`}>{json}</pre>
      )}

      {!loading && json === null && !routeMissing && !noResponse && (
        <div className="json-viewer text-slate-400">No response yet. Hit the button above.</div>
      )}
    </div>
  );
}
