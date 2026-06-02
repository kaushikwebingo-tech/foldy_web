import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { authApi } from '@/api/authApi';
import { setToken } from '@/lib/utils';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [regEmail, setEmail]   = useState('');
  const [regPass, setPass]     = useState('');
  const [regName, setName]     = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Auth — Login & OTP"
        subtitle="Phone-based OTP flow is the primary login. Token is auto-saved to localStorage on successful verify-otp."
        icon={<LogIn size={18} />}
        badge="Public"
      />

      <div className="space-y-4">
        {/* Send OTP */}
        <ApiCard
          title="Send OTP"
          method="POST"
          endpoint="/api/v1/onboarding/send-otp"
          description="Sends a 6-digit OTP to the phone number. Check server console for the OTP value."
          onSubmit={() => authApi.sendOtp(phone)}
        >
          <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="e.g. 9876543210" />
        </ApiCard>

        {/* Verify OTP */}
        <ApiCard
          title="Verify OTP"
          method="POST"
          endpoint="/api/v1/onboarding/verify-otp"
          description="Verifies the OTP. On success, the JWT is automatically saved and shown in the top bar."
          onSubmit={async () => {
            const res = await authApi.verifyOtp(phone, otp);
            if (res.data?.data?.token) setToken(res.data.data.token);
            return res;
          }}
        >
          <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="e.g. 9876543210" />
          <Field label="OTP" value={otp} onChange={setOtp} placeholder="6-digit OTP" />
        </ApiCard>

        {/* Legacy register */}
        <ApiCard
          title="Register (Email/Password)"
          method="POST"
          endpoint="/api/v1/auth/register"
          description="Legacy email+password registration endpoint."
          onSubmit={() => import('@/api/client').then(({ client }) =>
            client.post('/auth/register', { email: regEmail, password: regPass, fullName: regName })
          )}
        >
          <Field label="Full Name" value={regName} onChange={setName} placeholder="John Doe" />
          <Field label="Email" value={regEmail} onChange={setEmail} placeholder="user@example.com" type="email" />
          <Field label="Password" value={regPass} onChange={setPass} placeholder="••••••••" type="password" />
        </ApiCard>

        {/* Check trial */}
        <ApiCard
          title="Get Trial Status"
          method="GET"
          endpoint="/api/v1/trial/status"
          description="Returns current subscription/trial status for the authenticated user."
          onSubmit={() => authApi.getTrialStatus()}
        />

        {/* Check approval */}
        <ApiCard
          title="Check Approval Status"
          method="GET"
          endpoint="/api/v1/onboarding/is-user-allowed"
          description="Returns the admin approval status for this user's application request."
          onSubmit={() => authApi.checkApproval()}
        />
      </div>
    </div>
  );
}
