import { useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { Field, SelectField } from '@/components/Field';
import { client } from '@/api/client';
import { getApiOrigin } from '@/lib/utils';
import { Gauge } from 'lucide-react';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Mode = 'count' | 'duration';

interface Sample { ms: number; status: number; ok: boolean }

interface Stats {
  total: number;
  ok: number;
  failed: number;
  successRate: number;
  rps: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  status: Record<string, number>;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ label: m, value: m }));
const MODES = [
  { label: 'Fixed number of requests', value: 'count' },
  { label: 'Run for a duration', value: 'duration' },
];

// Guardrails so a stray value can't hammer the server by accident.
const MAX_CONCURRENCY = 100;
const MAX_TOTAL = 20000;
const MAX_DURATION = 300;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

function computeStats(samples: Sample[], elapsedMs: number): Stats {
  const total = samples.length;
  const ok = samples.reduce((n, s) => n + (s.ok ? 1 : 0), 0);
  const lat = samples.map((s) => s.ms).sort((a, b) => a - b);
  const sum = lat.reduce((a, b) => a + b, 0);
  const status: Record<string, number> = {};
  for (const s of samples) {
    const key = s.status === 0 ? 'network err' : `${Math.floor(s.status / 100)}xx`;
    status[key] = (status[key] ?? 0) + 1;
  }
  return {
    total,
    ok,
    failed: total - ok,
    successRate: total ? (ok / total) * 100 : 0,
    rps: elapsedMs > 0 ? total / (elapsedMs / 1000) : 0,
    avg: total ? sum / total : 0,
    min: lat[0] ?? 0,
    max: lat[lat.length - 1] ?? 0,
    p50: percentile(lat, 50),
    p90: percentile(lat, 90),
    p95: percentile(lat, 95),
    p99: percentile(lat, 99),
    status,
  };
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' | 'accent' }) {
  const color =
    tone === 'ok' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : tone === 'accent' ? 'text-blue-600' : 'text-slate-800';
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export default function LoadTestPage() {
  const [method, setMethod] = useState<Method>('GET');
  const [path, setPath] = useState('/user/plan-status');
  const [body, setBody] = useState('');
  const [concurrency, setConcurrency] = useState('10');
  const [mode, setMode] = useState<Mode>('count');
  const [total, setTotal] = useState('200');
  const [duration, setDuration] = useState('15');

  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [recent, setRecent] = useState<Sample[]>([]);
  const [error, setError] = useState('');

  const runningRef = useRef(false);
  const samplesRef = useRef<Sample[]>([]);
  const sentRef = useRef(0);
  const startRef = useRef(0);

  const stop = () => {
    runningRef.current = false;
    setRunning(false);
  };

  const start = async () => {
    setError('');
    let bodyObj: unknown = undefined;
    if (method !== 'GET' && body.trim()) {
      try {
        bodyObj = JSON.parse(body);
      } catch {
        setError('Request body is not valid JSON.');
        return;
      }
    }

    const conc = Math.max(1, Math.min(MAX_CONCURRENCY, Number(concurrency) || 1));
    const totalN = Math.max(1, Math.min(MAX_TOTAL, Number(total) || 1));
    const durMs = Math.max(1, Math.min(MAX_DURATION, Number(duration) || 1)) * 1000;

    samplesRef.current = [];
    sentRef.current = 0;
    startRef.current = performance.now();
    runningRef.current = true;
    setRunning(true);
    setStats(null);
    setProgress(0);
    setRecent([]);

    // Live snapshot ~4×/sec so the report updates in real time.
    const timer = setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      setStats(computeStats(samplesRef.current, elapsed));
      setProgress(mode === 'count' ? sentRef.current / totalN : Math.min(1, elapsed / durMs));
      setRecent(samplesRef.current.slice(-40));
    }, 250);

    const keepGoing = () => {
      if (!runningRef.current) return false;
      if (mode === 'count') return sentRef.current < totalN;
      return performance.now() - startRef.current < durMs;
    };

    const worker = async () => {
      while (keepGoing()) {
        sentRef.current += 1; // atomic in JS (no await before this)
        const t0 = performance.now();
        try {
          const res = await client.request({
            method,
            url: path,
            data: bodyObj,
            validateStatus: () => true, // 4xx/5xx are responses, not throws
          });
          samplesRef.current.push({
            ms: performance.now() - t0,
            status: res.status,
            ok: res.status >= 200 && res.status < 400,
          });
        } catch {
          samplesRef.current.push({ ms: performance.now() - t0, status: 0, ok: false });
        }
      }
    };

    await Promise.all(Array.from({ length: conc }, worker));

    clearInterval(timer);
    const elapsed = performance.now() - startRef.current;
    setStats(computeStats(samplesRef.current, elapsed));
    setProgress(1);
    setRecent(samplesRef.current.slice(-40));
    runningRef.current = false;
    setRunning(false);
  };

  const maxRecent = Math.max(1, ...recent.map((r) => r.ms));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Load Testing"
        subtitle="Fire concurrent requests at any endpoint and watch a live report — throughput, success rate, and latency percentiles. Uses your logged-in token and the API Host set in the sidebar."
        icon={<Gauge size={18} />}
        badge="Tools"
      />

      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <strong>Heads up:</strong> this runs from the browser, so real concurrency is capped by the
        browser's per-host connection limit — great for correctness-under-load and moderate throughput,
        not a replacement for k6 / Artillery at high RPS. Target is <code>{getApiOrigin() || 'the proxy (localhost)'}</code>.
        Don't point heavy runs at production.
      </div>

      {/* Config */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <SelectField label="Method" value={method} onChange={(v) => setMethod(v as Method)} options={METHODS} />
          <div className="col-span-2">
            <Field label="Path (after /api/v1)" value={path} onChange={setPath} placeholder="/user/plan-status" fullWidth />
          </div>
        </div>

        {method !== 'GET' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Request body (JSON)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{ "key": "value" }'
              rows={3}
              className="w-full text-sm font-mono rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Field label={`Concurrency (max ${MAX_CONCURRENCY})`} value={concurrency} onChange={setConcurrency} placeholder="10" />
          <div className="col-span-2">
            <SelectField label="Stop condition" value={mode} onChange={(v) => setMode(v as Mode)} options={MODES} fullWidth />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {mode === 'count' ? (
            <Field label={`Total requests (max ${MAX_TOTAL})`} value={total} onChange={setTotal} placeholder="200" />
          ) : (
            <Field label={`Duration seconds (max ${MAX_DURATION})`} value={duration} onChange={setDuration} placeholder="15" />
          )}
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        <div className="flex gap-3">
          {!running ? (
            <button
              onClick={start}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Start load test
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
            >
              Stop
            </button>
          )}
        </div>

        {(running || progress > 0) && (
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Live report */}
      {stats && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Live report {running && <span className="text-blue-500">· running…</span>}</div>
            <div className="text-xs text-slate-400">{stats.total} requests</div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Success rate" value={`${stats.successRate.toFixed(1)}%`} tone={stats.successRate >= 99 ? 'ok' : stats.successRate >= 90 ? 'accent' : 'bad'} />
            <StatCard label="Throughput" value={`${stats.rps.toFixed(1)} req/s`} tone="accent" />
            <StatCard label="Failed" value={`${stats.failed}`} tone={stats.failed ? 'bad' : 'ok'} />
            <StatCard label="Avg latency" value={`${stats.avg.toFixed(0)} ms`} />
            <StatCard label="Min / Max" value={`${stats.min.toFixed(0)} / ${stats.max.toFixed(0)} ms`} />
            <StatCard label="Succeeded" value={`${stats.ok}`} tone="ok" />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Latency percentiles</div>
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="p50" value={`${stats.p50.toFixed(0)} ms`} />
              <StatCard label="p90" value={`${stats.p90.toFixed(0)} ms`} />
              <StatCard label="p95" value={`${stats.p95.toFixed(0)} ms`} />
              <StatCard label="p99" value={`${stats.p99.toFixed(0)} ms`} />
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Status breakdown</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.status).map(([k, v]) => (
                <span
                  key={k}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    k === '2xx' ? 'bg-emerald-50 text-emerald-700' : k === '3xx' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>

          {/* Recent-latency sparkline */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Recent requests (latency)</div>
            <div className="flex items-end gap-0.5 h-16">
              {recent.map((r, i) => (
                <div
                  key={i}
                  title={`${r.ms.toFixed(0)} ms · ${r.status || 'err'}`}
                  className={`flex-1 rounded-sm ${r.ok ? 'bg-emerald-400' : 'bg-red-400'}`}
                  style={{ height: `${Math.max(6, (r.ms / maxRecent) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
