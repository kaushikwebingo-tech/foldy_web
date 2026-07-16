import { ArrowUpRight } from 'lucide-react';
import CopyButton from './CopyButton';

/*
 * RequestViewer
 * Shows the ACTUAL request that went to the API, read from the axios response/error
 * `config` (so it's the real serialized payload, not a guess). Rendered by ApiCard
 * above the ResponseViewer. Each section (endpoint, headers, query, body) has its
 * own copy button. Returns null until a request has been made.
 */

interface AxiosLikeConfig {
  method?: string;
  baseURL?: string;
  url?: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: unknown;
}

interface Props {
  config?: unknown;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  PUT: 'bg-orange-100 text-orange-700',
  PATCH: 'bg-amber-100 text-amber-700',
};

function maskToken(value: string): string {
  // "Bearer eyJ...abcd" → "Bearer ••••abcd"
  const parts = value.split(' ');
  const raw = parts.length > 1 ? parts[parts.length - 1] : value;
  if (!raw || raw.length < 4) return value;
  const masked = `••••${raw.slice(-4)}`;
  return parts.length > 1 ? `${parts.slice(0, -1).join(' ')} ${masked}` : masked;
}

function normalizeHeaders(headers: unknown): Record<string, string> {
  if (!headers) return {};
  // axios stores config.headers as an AxiosHeaders instance — toJSON() flattens it.
  const src =
    typeof (headers as { toJSON?: () => unknown }).toJSON === 'function'
      ? (headers as { toJSON: () => unknown }).toJSON()
      : headers;

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') continue; // skip default buckets (common/get/post/…)
    out[k] = k.toLowerCase() === 'authorization' ? maskToken(String(v)) : String(v);
  }
  return out;
}

function parseBody(data: unknown): { kind: 'json' | 'text' | 'form'; value: string } | null {
  if (data === undefined || data === null || data === '') return null;

  // multipart upload — axios holds a FormData instance.
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of data.entries()) {
      fields[k] = v instanceof File ? `(file: ${v.name}, ${v.size} bytes)` : v;
    }
    return { kind: 'form', value: JSON.stringify(fields, null, 2) };
  }

  // JSON bodies are serialized to a string by the time the request fires.
  if (typeof data === 'string') {
    try {
      return { kind: 'json', value: JSON.stringify(JSON.parse(data), null, 2) };
    } catch {
      return { kind: 'text', value: data };
    }
  }

  try {
    return { kind: 'json', value: JSON.stringify(data, null, 2) };
  } catch {
    return { kind: 'text', value: String(data) };
  }
}

/* Section label row with its own copy button. */
function SectionLabel({ label, copyText }: { label: string; copyText: string }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <CopyButton text={copyText} />
    </div>
  );
}

export default function RequestViewer({ config }: Props) {
  const cfg = config as AxiosLikeConfig | undefined;
  if (!cfg) return null;

  const method = (cfg.method ?? 'GET').toUpperCase();
  const fullUrl = `${cfg.baseURL ?? ''}${cfg.url ?? ''}`;
  const params = cfg.params && Object.keys(cfg.params).length ? cfg.params : undefined;
  const paramsJson = params ? JSON.stringify(params, null, 2) : '';
  const body = parseBody(cfg.data);
  const headers = normalizeHeaders(cfg.headers);
  const headersJson = JSON.stringify(headers, null, 2);
  const hasHeaders = Object.keys(headers).length > 0;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2">
        <ArrowUpRight className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Request</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${METHOD_COLORS[method] ?? 'bg-slate-100 text-slate-600'}`}>
          {method}
        </span>
      </div>

      {/* Endpoint */}
      <SectionLabel label="Endpoint" copyText={fullUrl} />
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 mb-2">
        <code className="text-xs text-slate-600 break-all">{fullUrl || '(no url)'}</code>
      </div>

      {/* Headers (Authorization value masked) */}
      {hasHeaders && (
        <>
          <SectionLabel label="Headers" copyText={headersJson} />
          <pre className="json-viewer mb-2">{headersJson}</pre>
        </>
      )}

      {/* Query params */}
      {params && (
        <>
          <SectionLabel label="Query params" copyText={paramsJson} />
          <pre className="json-viewer mb-2">{paramsJson}</pre>
        </>
      )}

      {/* Body */}
      {body ? (
        <>
          <SectionLabel
            label={`Body${body.kind === 'form' ? ' (multipart/form-data)' : ''}`}
            copyText={body.value}
          />
          <pre className="json-viewer">{body.value}</pre>
        </>
      ) : (
        !params && <div className="text-xs text-slate-400">No request body.</div>
      )}
    </div>
  );
}
