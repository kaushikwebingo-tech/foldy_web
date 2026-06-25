import { useState } from "react";
import ApiCard from "@/components/ApiCard";
import { Field } from "@/components/Field";
import PageHeader from "@/components/PageHeader";
import { authApi } from "@/api/authApi";
import { setToken } from "@/lib/utils";
import { User } from "lucide-react";

/*
 * PAN-first onboarding (registration). Step 1 is a PAN + Name + DOB demographic
 * match (Sandbox) — no PAN OTP. On a match the server returns a registrationToken;
 * registration then verifies Phone & Email via OTP and create-profile auto-logs in.
 * Existing PAN → use the Login page (SMS OTP). Dev: OTPs print to the SERVER console.
 */
export default function OnboardingPage() {
  const [pan, setPan] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [regToken, setRegToken] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Onboarding (PAN-first)"
        subtitle="Register with a PAN + Name + DOB identity match, then verify Phone & Email by OTP."
        icon={<User size={18} />}
        badge="Public"
        postmanSection="onboarding"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Verify Identity (PAN + Name + DOB) → returns a
        <code className="mx-1">registrationToken</code> → verify Phone &amp; Email OTP → Create Profile (auto-login).
        <strong> Existing PAN?</strong> Use the <strong>Login</strong> page (SMS OTP). All OTPs print to the <strong>server console</strong>.
      </div>

      <div className="space-y-4">
        {/* 1. Identity verification (demographic match) */}
        <ApiCard
          step={1}
          title="Verify Identity (PAN + Name + DOB)"
          method="POST"
          endpoint="/api/v1/onboarding/pan"
          description="Demographic match via Sandbox. New PAN → returns a registrationToken + name (copied into the steps below). Existing PAN → returns mode:'login' (use the Login page instead)."
          onSubmit={async () => {
            const res = await authApi.panEntry(pan, name, dob);
            const data = res.data?.data;
            if (data?.registrationToken) setRegToken(data.registrationToken);
            if (data?.name) setName(data.name);
            return res;
          }}
        >
          <Field label="PAN" value={pan} onChange={setPan} placeholder="ABCDE1234F" />
          <Field label="Name as per PAN" value={name} onChange={setName} placeholder="Full Legal Name" />
          <Field label="Date of Birth / Incorporation" value={dob} onChange={setDob} placeholder="DD/MM/YYYY" />
        </ApiCard>

        {/* 2. Phone OTP — send */}
        <ApiCard
          step={2}
          title="Send Phone OTP"
          method="POST"
          endpoint="/api/v1/onboarding/otp/send"
          description="Layer 1. channel = phone. Requires the registrationToken from step 1."
          onSubmit={() => authApi.sendOtp(regToken, "phone", phone)}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 1 response" fullWidth />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="9876543210" />
        </ApiCard>

        {/* 3. Phone OTP — verify */}
        <ApiCard
          step={3}
          title="Verify Phone OTP"
          method="POST"
          endpoint="/api/v1/onboarding/otp/verify"
          description="Layer 1. channel = phone."
          onSubmit={() => authApi.verifyOtp(regToken, "phone", phoneOtp)}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 1 response" fullWidth />
          <Field label="OTP" value={phoneOtp} onChange={setPhoneOtp} placeholder="6-digit OTP (server console)" />
        </ApiCard>

        {/* 4. Email OTP — send */}
        <ApiCard
          step={4}
          title="Send Email OTP"
          method="POST"
          endpoint="/api/v1/onboarding/otp/send"
          description="Layer 2. channel = email."
          onSubmit={() => authApi.sendOtp(regToken, "email", email)}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 1 response" fullWidth />
          <Field label="Email" value={email} onChange={setEmail} placeholder="user@example.com" type="email" />
        </ApiCard>

        {/* 5. Email OTP — verify */}
        <ApiCard
          step={5}
          title="Verify Email OTP"
          method="POST"
          endpoint="/api/v1/onboarding/otp/verify"
          description="Layer 2. channel = email."
          onSubmit={() => authApi.verifyOtp(regToken, "email", emailOtp)}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 1 response" fullWidth />
          <Field label="OTP" value={emailOtp} onChange={setEmailOtp} placeholder="6-digit OTP (server console)" />
        </ApiCard>

        {/* 6. Create profile */}
        <ApiCard
          step={6}
          title="Create Profile (auto-login)"
          method="POST"
          endpoint="/api/v1/onboarding/create-profile"
          description="Requires Phone + Email verified. Name defaults to the identity-matched name. Returns a JWT (auto-saved here)."
          onSubmit={async () => {
            const res = await authApi.createProfile(regToken, name || undefined);
            const token = res.data?.data?.token;
            if (token) {
              setToken(token);
              window.location.reload();
            }
            return res;
          }}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 1 response" fullWidth />
          <Field label="Name (optional)" value={name} onChange={setName} placeholder="Defaults to the matched PAN name" fullWidth />
        </ApiCard>
      </div>
    </div>
  );
}
