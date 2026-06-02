import { useEffect, useState } from 'react';
import { authApi } from '@/api/authApi';
import { getToken } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle,
  HardDrive, FolderOpen, FileText, ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlanData {
  planType: string;
  status: string;
  isExpired: boolean;
  daysRemaining: number;
  startDate: string;
  endDate: string;
  limits: {
    storageLimit: number;
    maxFolders: number;
    maxFilesPerFolder: number;
  };
}

const PLAN_LABELS: Record<string, string> = {
  trial:      '7-Day Free Trial',
  individual: 'Individual Plan',
  business:   'Business Plan',
  enterprise: 'Enterprise Plan',
};

const PLAN_TOTAL_DAYS: Record<string, number> = {
  trial:      7,
  individual: 365,
  business:   365,
  enterprise: 365,
};

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 ** 3);
  return `${gb % 1 === 0 ? gb : gb.toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function PlanStatusCard() {
  const [plan, setPlan]       = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const navigate              = useNavigate();
  const hasToken              = !!getToken();

  useEffect(() => {
    if (!hasToken) { setLoading(false); return; }
    authApi.getTrialStatus()
      .then(res => setPlan(res.data?.data ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [hasToken]);

  /* ── not logged in ── */
  if (!hasToken) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Clock size={18} className="text-slate-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600">No active session</p>
          <p className="text-xs text-slate-400">Log in to see your plan status and time remaining.</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-xs font-semibold text-[#1A73E8] hover:underline whitespace-nowrap"
        >
          Login →
        </button>
      </div>
    );
  }

  /* ── loading ── */
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
        <div className="h-2 bg-slate-100 rounded w-full mb-2" />
        <div className="h-2 bg-slate-100 rounded w-2/3" />
      </div>
    );
  }

  /* ── fetch failed ── */
  if (error || !plan) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
        <XCircle size={18} className="text-red-400 shrink-0" />
        <p className="text-sm text-red-600">Could not load plan status. Make sure the backend is running.</p>
      </div>
    );
  }

  /* ── derived values ── */
  const isExpired    = plan.isExpired || plan.status === 'expired' || plan.status === 'cancelled';
  const isExpiringSoon = !isExpired && plan.daysRemaining <= 3;
  const totalDays    = PLAN_TOTAL_DAYS[plan.planType] ?? 30;
  const progressPct  = isExpired ? 0 : Math.min(100, Math.round((plan.daysRemaining / totalDays) * 100));
  const planLabel    = PLAN_LABELS[plan.planType] ?? plan.planType;

  /* ── colour scheme ── */
  const scheme = isExpired
    ? { bar: 'bg-red-400',    bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-600',    badge: 'bg-red-100 text-red-700'    }
    : isExpiringSoon
    ? { bar: 'bg-amber-400',  bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700' }
    : { bar: 'bg-green-400',  bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700' };

  const StatusIcon = isExpired ? XCircle : isExpiringSoon ? AlertTriangle : CheckCircle2;

  return (
    <div className={`rounded-2xl border ${scheme.border} ${scheme.bg} p-5`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <StatusIcon size={18} className={scheme.text} />
          <div>
            <p className="text-sm font-bold text-slate-800">{planLabel}</p>
            <p className={`text-xs font-semibold ${scheme.text}`}>
              {isExpired
                ? plan.status === 'cancelled' ? 'Cancelled' : 'Expired'
                : isExpiringSoon
                ? `Expiring soon — ${plan.daysRemaining} day${plan.daysRemaining === 1 ? '' : 's'} left`
                : `Active — ${plan.daysRemaining} day${plan.daysRemaining === 1 ? '' : 's'} remaining`}
            </p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scheme.badge}`}>
          {plan.status.toUpperCase()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{isExpired ? 'Plan ended' : `${plan.daysRemaining} days left`}</span>
          <span>{isExpired ? '0%' : `${progressPct}%`}</span>
        </div>
        <div className="w-full h-2 bg-white/70 rounded-full border border-white overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scheme.bar}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="flex gap-4 mb-4 text-xs text-slate-500">
        <span>Start: <strong className="text-slate-700">{formatDate(plan.startDate)}</strong></span>
        {plan.endDate && (
          <span>
            {isExpired ? 'Expired' : 'Expires'}: <strong className="text-slate-700">{formatDate(plan.endDate)}</strong>
          </span>
        )}
      </div>

      {/* Limits */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/70 rounded-xl p-3 text-center border border-white">
          <HardDrive size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="text-xs font-bold text-slate-700">{formatBytes(plan.limits.storageLimit)}</p>
          <p className="text-[10px] text-slate-400">Storage</p>
        </div>
        <div className="bg-white/70 rounded-xl p-3 text-center border border-white">
          <FolderOpen size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="text-xs font-bold text-slate-700">{plan.limits.maxFolders}</p>
          <p className="text-[10px] text-slate-400">Max Folders</p>
        </div>
        <div className="bg-white/70 rounded-xl p-3 text-center border border-white">
          <FileText size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="text-xs font-bold text-slate-700">{plan.limits.maxFilesPerFolder}</p>
          <p className="text-[10px] text-slate-400">Files/Folder</p>
        </div>
      </div>

      {/* CTA */}
      {(isExpired || isExpiringSoon) && (
        <button
          onClick={() => navigate('/payments')}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#1A73E8] hover:bg-[#1558C0] text-white text-xs font-bold rounded-xl transition-colors"
        >
          {isExpired ? 'Renew Plan' : 'Upgrade Now'}
          <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}
