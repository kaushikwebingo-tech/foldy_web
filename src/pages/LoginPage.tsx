import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { authApi } from '@/api/authApi';
import { getToken, setToken, removeToken } from '@/lib/utils';
import { LogIn, CheckCircle2, LogOut, LayoutDashboard } from 'lucide-react';

/* ─── PAN login cards (shared) ─────────────────────────────────────── */
function PanLoginCards() {
  const [pan, setPan]                 = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [otp, setOtp]                 = useState('');

  return (
    <div className="space-y-4">
      <div className="mb-1 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        Login is PAN-first: enter your PAN to receive an OTP on your registered mobile, then verify it.
        New PAN? Use the <strong>Onboarding</strong> page to register. OTPs print to the server console.
      </div>

      <ApiCard
        step={1}
        title="PAN Entry"
        method="POST"
        endpoint="/api/v1/onboarding/pan"
        description="Existing PAN → SMS OTP to the registered mobile (login). New PAN → starts registration. Copy referenceId into step 2."
        onSubmit={() => authApi.panEntry(pan)}
      >
        <Field label="PAN" value={pan} onChange={setPan} placeholder="ABCDE1234F" fullWidth />
      </ApiCard>

      <ApiCard
        step={2}
        title="Verify OTP & Login"
        method="POST"
        endpoint="/api/v1/onboarding/pan/verify-otp"
        description="On an existing PAN this returns a JWT and logs you in automatically."
        onSubmit={async () => {
          const res = await authApi.verifyPanOtp(referenceId, otp);
          const data = res.data?.data;
          if (data?.mode === 'login' && data?.token) {
            setToken(data.token);
            window.location.reload();
          }
          return res;
        }}
      >
        <Field label="referenceId" value={referenceId} onChange={setReferenceId} placeholder="From PAN entry response" fullWidth />
        <Field label="OTP" value={otp} onChange={setOtp} placeholder="6-digit OTP (server console)" />
      </ApiCard>

      <ApiCard
        step={3}
        title="Get Trial / Plan Status"
        method="GET"
        endpoint="/api/v1/user/plan-status"
        description="Returns the current subscription status for the authenticated user."
        onSubmit={() => authApi.getTrialStatus()}
      />
    </div>
  );
}

/* ─── Already-logged-in banner ─────────────────────────────────────── */
function AlreadyLoggedIn() {
  const navigate = useNavigate();
  const token    = getToken()!;

  const handleLogout = () => {
    removeToken();
    window.location.reload();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Auth — PAN Login"
        subtitle="Manage your session."
        icon={<LogIn size={18} />}
        badge="Public"
        postmanSection="onboarding"
      />

      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-green-800 text-sm">You are already logged in</p>
            <p className="text-xs text-green-600">An active JWT session is stored in your browser.</p>
          </div>
        </div>

        <div className="bg-white border border-green-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Current Token</p>
          <code className="text-xs text-slate-700 break-all leading-5">{token.slice(0, 60)}…</code>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A73E8] hover:bg-[#1558C0] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <LayoutDashboard size={15} />
            Go to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-xl transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>

      <PanLoginCards />
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────── */
export default function LoginPage() {
  const loggedIn = !!getToken();
  if (loggedIn) return <AlreadyLoggedIn />;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Auth — PAN Login"
        subtitle="PAN-first login. The JWT is auto-saved to localStorage on a successful OTP verify."
        icon={<LogIn size={18} />}
        badge="Public"
        postmanSection="onboarding"
      />
      <PanLoginCards />
    </div>
  );
}
