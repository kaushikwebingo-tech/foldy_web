import { useState } from "react";
import ApiCard from "@/components/ApiCard";
import { Field } from "@/components/Field";
import PageHeader from "@/components/PageHeader";
import { authApi } from "@/api/authApi";
import { setToken } from "@/lib/utils";
import { User } from "lucide-react";

/*
 * PAN-first onboarding. Single entry (POST /onboarding/pan) branches register vs
 * login. Registration = 3 OTP layers (PAN → Phone → Email) → create-profile.
 * Dev: every OTP is printed to the SERVER console ([DEV OTP] / [AuthBridge STUB]).
 */
export default function OnboardingPage() {
  const [pan, setPan] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [panOtp, setPanOtp] = useState("");
  const [regToken, setRegToken] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Onboarding (PAN-first)"
        subtitle="One entry (PAN) handles register & login. Registration runs 3 OTP layers: PAN → Phone → Email."
        icon={<User size={18} />}
        badge="Public"
        postmanSection="onboarding"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Enter PAN → verify PAN OTP. <strong>New PAN</strong> → returns a
        <code className="mx-1">registrationToken</code> → verify Phone &amp; Email OTP → Create Profile (auto-login).
        <strong> Existing PAN</strong> → PAN OTP returns a JWT (login). All OTPs are printed to the <strong>server console</strong>.
      </div>

      <div className="space-y-4">
        {/* 1. PAN entry */}
        <ApiCard
          step={1}
          title="PAN Entry (Register or Login)"
          method="POST"
          endpoint="/api/v1/onboarding/pan"
          description="Single entry. New PAN → sends OTP to the PAN-linked mobile (register). Existing PAN → SMS OTP to the registered mobile (login). Copy the returned referenceId into step 2."
          onSubmit={() => authApi.panEntry(pan)}
        >
          <Field label="PAN" value={pan} onChange={setPan} placeholder="ABCDE1234F" fullWidth />
        </ApiCard>

        {/* 2. Verify PAN OTP */}
        <ApiCard
          step={2}
          title="Verify PAN OTP"
          method="POST"
          endpoint="/api/v1/onboarding/pan/verify-otp"
          description="Layer 1. Register → returns registrationToken + name. Login → returns a JWT (auto-saved here)."
          onSubmit={async () => {
            const res = await authApi.verifyPanOtp(referenceId, panOtp);
            const data = res.data?.data;
            if (data?.mode === "login" && data?.token) {
              setToken(data.token);
              window.location.reload();
            } else if (data?.registrationToken) {
              setRegToken(data.registrationToken);
            }
            return res;
          }}
        >
          <Field label="referenceId" value={referenceId} onChange={setReferenceId} placeholder="From PAN entry response" fullWidth />
          <Field label="OTP" value={panOtp} onChange={setPanOtp} placeholder="6-digit OTP (server console)" />
        </ApiCard>

        {/* 3. Phone OTP — send */}
        <ApiCard
          step={3}
          title="Send Phone OTP"
          method="POST"
          endpoint="/api/v1/onboarding/otp/send"
          description="Layer 2. channel = phone. Requires a PAN-verified registrationToken."
          onSubmit={() => authApi.sendOtp(regToken, "phone", phone)}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 2 response" fullWidth />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="9876543210" />
        </ApiCard>

        {/* 4. Phone OTP — verify */}
        <ApiCard
          step={4}
          title="Verify Phone OTP"
          method="POST"
          endpoint="/api/v1/onboarding/otp/verify"
          description="Layer 2. channel = phone."
          onSubmit={() => authApi.verifyOtp(regToken, "phone", phoneOtp)}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 2 response" fullWidth />
          <Field label="OTP" value={phoneOtp} onChange={setPhoneOtp} placeholder="6-digit OTP (server console)" />
        </ApiCard>

        {/* 5. Email OTP — send */}
        <ApiCard
          step={5}
          title="Send Email OTP"
          method="POST"
          endpoint="/api/v1/onboarding/otp/send"
          description="Layer 3. channel = email."
          onSubmit={() => authApi.sendOtp(regToken, "email", email)}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 2 response" fullWidth />
          <Field label="Email" value={email} onChange={setEmail} placeholder="user@example.com" type="email" />
        </ApiCard>

        {/* 6. Email OTP — verify */}
        <ApiCard
          step={6}
          title="Verify Email OTP"
          method="POST"
          endpoint="/api/v1/onboarding/otp/verify"
          description="Layer 3. channel = email."
          onSubmit={() => authApi.verifyOtp(regToken, "email", emailOtp)}
        >
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 2 response" fullWidth />
          <Field label="OTP" value={emailOtp} onChange={setEmailOtp} placeholder="6-digit OTP (server console)" />
        </ApiCard>

        {/* 7. Create profile */}
        <ApiCard
          step={7}
          title="Create Profile (auto-login)"
          method="POST"
          endpoint="/api/v1/onboarding/create-profile"
          description="Requires PAN + Phone + Email all verified. Name defaults to the PAN-fetched name. Returns a JWT (auto-saved here)."
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
          <Field label="registrationToken" value={regToken} onChange={setRegToken} placeholder="From step 2 response" fullWidth />
          <Field label="Name (optional)" value={name} onChange={setName} placeholder="Defaults to PAN holder name" fullWidth />
        </ApiCard>
      </div>
    </div>
  );
}
