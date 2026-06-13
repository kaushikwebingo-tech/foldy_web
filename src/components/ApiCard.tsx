import { useState, type ReactNode } from 'react';
import ResponseViewer from './ResponseViewer';

interface Props {
  title: string;
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  endpoint: string;
  description?: string;
  children?: ReactNode;
  onSubmit: () => Promise<unknown>;
  buttonLabel?: string;
}

const METHOD_COLORS = {
  GET:    'bg-green-100 text-green-700',
  POST:   'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  PUT:    'bg-orange-100 text-orange-700',
  PATCH:  'bg-amber-100 text-amber-700',
};

export default function ApiCard({ title, method, endpoint, description, children, onSubmit, buttonLabel = 'Send Request' }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<unknown>(undefined);
  const [error, setError]     = useState<unknown>(undefined);

  const handleSubmit = async () => {
    setLoading(true);
    setData(undefined);
    setError(undefined);
    try {
      const res = await onSubmit();
      setData((res as { data?: unknown })?.data ?? res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${METHOD_COLORS[method]}`}>
                {method}
              </span>
              <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{endpoint}</code>
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-[#1A73E8] hover:bg-[#1558C0] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : null}
            {loading ? 'Sending…' : buttonLabel}
          </button>
        </div>
      </div>

      {/* Form fields */}
      {children && (
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {children}
          </div>
        </div>
      )}

      {/* Response */}
      <div className="px-5 py-4">
        <ResponseViewer data={data} error={error} loading={loading} />
      </div>
    </div>
  );
}
