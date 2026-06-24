import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { authApi } from '@/api/authApi';
import { client } from '@/api/client';
import { getToken, setToken, removeToken } from '@/lib/utils';
import { LogIn, CheckCircle2, LogOut, LayoutDashboard } from 'lucide-react';

/* ─── Already-logged-in banner ──────────────────────────────────────── */
function AlreadyLoggedIn() {
  const navigate = useNavigate();
  const token    = getToken()!;

  const handleLogout = () => {
    removeToken();
    // reload so sidebar re-evaluates auth state
    window.location.reload();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Auth — Login & OTP"
        subtitle="Manage your session."
        icon={<LogIn size={18} />}
        badge="Public"
        postmanSection="auth"
      />

      {/* Session active card */}
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

        {/* Token preview */}
        <div className="bg-white border border-green-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Current Token</p>
          <code className="text-xs text-slate-700 break-all leading-5">
            {token.slice(0, 60)}…
          </code>
        </div>

        {/* Actions */}
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

      {/* Still allow raw API testing below */}
      <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-600">Raw API testing:</strong> You can still call the endpoints below to test them directly.
        </p>
      </div>

      <RawAuthCards phone="" otp="" regEmail="" regName="" regPass="" />
    </div>
  );
}

/* ─── Raw API cards (shared between both states) ─────────────────── */
function RawAuthCards({
  phone: initPhone, otp: initOtp,
  regEmail: initEmail, regName: initName, regPass: initPass,
}: {
  phone: string; otp: string;
  regEmail: string; regName: string; regPass: string;
}) {
  const [phone, setPhone]   = useState(initPhone);
  const [otp, setOtp]       = useState(initOtp);
  const [regEmail, setEmail] = useState(initEmail);
  const [regPass, setPass]   = useState(initPass);
  const [regName, setName]   = useState(initName);

  return (
    <div className="space-y-4">
      <ApiCard
        step={1}
        title="Send OTP"
        method="POST"
        endpoint="/api/v1/onboarding/send-otp"
        description="Sends a 6-digit OTP to the phone number. Check the server console for the OTP value."
        onSubmit={() => authApi.sendOtp(phone)}
      >
        <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="e.g. 9876543210" />
      </ApiCard>

      <ApiCard
        step={2}
        title="Verify OTP"
        method="POST"
        endpoint="/api/v1/onboarding/verify-otp"
        description="Verifies the OTP. On success the JWT is automatically saved and shown in the top bar."
        onSubmit={async () => {
          const res = await authApi.verifyOtp(phone, otp);
          if (res.data?.data?.token) {
            setToken(res.data.data.token);
            window.location.reload();   // refresh sidebar auth state
          }
          return res;
        }}
      >
        <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="e.g. 9876543210" />
        <Field label="OTP"          value={otp}   onChange={setOtp}   placeholder="6-digit OTP"    />
      </ApiCard>

      <ApiCard
        step={3}
        title="Register (Email / Password)"
        method="POST"
        endpoint="/api/v1/auth/register"
        description="Legacy email+password registration. Requires phone, email, password (≥ 8 chars) and full name."
        onSubmit={() => client.post('/auth/register', { phoneno: phone, email: regEmail, password: regPass, fullName: regName })}
      >
        <Field label="Phone Number" value={phone}   onChange={setPhone} placeholder="9876543210"        />
        <Field label="Full Name"    value={regName}  onChange={setName}  placeholder="John Doe"          />
        <Field label="Email"        value={regEmail} onChange={setEmail} placeholder="user@example.com"  type="email"    />
        <Field label="Password"     value={regPass}  onChange={setPass}  placeholder="••••••••"          type="password" />
      </ApiCard>

      <ApiCard
        step={4}
        title="Get Trial / Plan Status"
        method="GET"
        endpoint="/api/v1/user/plan-status"
        description="Returns current subscription status for the authenticated user."
        onSubmit={() => authApi.getTrialStatus()}
      />

      <ApiCard
        step={5}
        title="Check Approval Status"
        method="GET"
        endpoint="/api/v1/onboarding/is-user-allowed"
        description="Returns the admin approval status for this user's application request."
        onSubmit={() => authApi.checkApproval()}
      />
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────── */
export default function LoginPage() {
  const loggedIn = !!getToken();

  /* already logged in — show session banner first */
  if (loggedIn) return <AlreadyLoggedIn />;

  /* not logged in — show clean login flow */
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Auth — Login & OTP"
        subtitle="Phone-based OTP flow is the primary login. Token is auto-saved to localStorage on successful verify-otp."
        icon={<LogIn size={18} />}
        badge="Public"
        postmanSection="auth"
      />
      <RawAuthCards phone="" otp="" regEmail="" regName="" regPass="" />
    </div>
  );
}
