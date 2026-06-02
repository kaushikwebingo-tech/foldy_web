import { getToken } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  LogIn, User, Building2, BarChart2,
  FileText, Receipt, FolderOpen, CreditCard,
  HardDrive, ShieldCheck, ArrowRight,
} from 'lucide-react';

const MODULES = [
  { label: 'Login / OTP',     path: '/login',          icon: <LogIn size={20} />,       desc: 'Phone OTP auth + trial status',       badge: 'Public' },
  { label: 'Onboarding',      path: '/onboarding',     icon: <User size={20} />,        desc: 'PAN · Aadhaar · GSTIN · Bank KYC',     badge: 'Public' },
  { label: 'GST Profile',     path: '/gst-profile',    icon: <Building2 size={20} />,   desc: 'GSTIN public business info lookup',    badge: 'B2B' },
  { label: 'Finance Status',  path: '/finance-status', icon: <BarChart2 size={20} />,   desc: 'Track GSTR filing status',             badge: 'B2B' },
  { label: 'GST Taxpayer',    path: '/gst-taxpayer',   icon: <FileText size={20} />,    desc: 'GST portal session + GSTR-1 data',     badge: 'B2B' },
  { label: 'TDS',             path: '/tds',            icon: <Receipt size={20} />,     desc: 'TRACES Form 16 / 16A jobs',            badge: 'B2B' },
  { label: 'Storage',         path: '/storage',        icon: <FolderOpen size={20} />,  desc: 'Document vault · folders · files',     badge: 'Auth' },
  { label: 'Payments',        path: '/payments',       icon: <CreditCard size={20} />,  desc: 'Razorpay order creation & verification', badge: 'Auth' },
  { label: 'DigiLocker',      path: '/digilocker',     icon: <HardDrive size={20} />,   desc: 'Government document fetch via UIDAI',  badge: 'Public' },
  { label: 'Admin Panel',     path: '/admin',          icon: <ShieldCheck size={20} />, desc: 'Approve / reject · user management',  badge: 'Admin' },
];

const BADGE_STYLES: Record<string, string> = {
  'Public': 'bg-green-100 text-green-700',
  'B2B':    'bg-blue-100 text-blue-700',
  'Auth':   'bg-purple-100 text-purple-700',
  'Admin':  'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const hasToken = !!getToken();

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 bg-gradient-to-r from-[#0D1B2A] to-[#1A2B3C] rounded-2xl px-8 py-8 text-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-[#1A73E8] rounded-lg flex items-center justify-center text-sm font-bold">F</div>
          <span className="text-sm font-semibold text-blue-300">Developer Console</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Foldy API Test Console</h1>
        <p className="text-sm text-slate-300 max-w-xl">
          Test every backend API endpoint from this interface. All responses are shown inline.
          Start by logging in via OTP to get your JWT, then explore the B2B and storage modules.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {hasToken ? (
            <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/20 text-green-300 border border-green-500/30 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              JWT active — ready to test protected routes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
              Not logged in — go to Login to get a token
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-slate-300 border border-white/10 rounded-full px-3 py-1">
            10 modules · {Object.keys(MODULES).length} API groups
          </span>
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map(mod => (
          <button
            key={mod.path}
            onClick={() => navigate(mod.path)}
            className="group text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-[#1A73E8] hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#1A73E8]/10 flex items-center justify-center text-slate-500 group-hover:text-[#1A73E8] transition-colors">
                {mod.icon}
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[mod.badge] ?? 'bg-slate-100 text-slate-500'}`}>
                {mod.badge}
              </span>
            </div>
            <h3 className="font-semibold text-slate-800 text-sm mb-1">{mod.label}</h3>
            <p className="text-xs text-slate-500 mb-3">{mod.desc}</p>
            <div className="flex items-center gap-1 text-xs text-[#1A73E8] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ArrowRight size={12} />
            </div>
          </button>
        ))}
      </div>

      {/* Quick tip */}
      <div className="mt-6 px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500">
        <strong className="text-slate-600">Tip:</strong> The backend must be running on <code className="bg-slate-200 px-1 rounded">localhost:5000</code> before making any API calls. Check the green indicator in the top bar.
      </div>
    </div>
  );
}
