import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { authApi } from '@/api/authApi';
import { User } from 'lucide-react';

export default function OnboardingPage() {
  const [pan, setPan]             = useState('');
  const [panName, setPanName]     = useState('');
  const [dob, setDob]             = useState('');
  const [gstin, setGstin]         = useState('');
  const [ifsc, setIfsc]           = useState('');
  const [account, setAccount]     = useState('');
  const [aadhaar, setAadhaar]     = useState('');
  const [aadhaarOtp, setAOtp]     = useState('');
  const [refId, setRefId]         = useState('');
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [occupation, setOccupation] = useState('');
  const [cinNo, setCin]           = useState('');
  const [tanNo, setTan]           = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Onboarding & KYC Verification"
        subtitle="All KYC verification steps. PAN, Aadhaar, GSTIN and Bank verification call the Sandbox API."
        icon={<User size={18} />}
        badge="Public"
      />

      <div className="space-y-4">
        {/* Verify PAN */}
        <ApiCard
          title="Verify PAN"
          method="POST"
          endpoint="/api/v1/onboarding/verify-pan"
          description="Verifies PAN number against the user's name and date of birth via Sandbox KYC."
          onSubmit={() => authApi.verifyPan(pan, panName, dob)}
        >
          <Field label="PAN Number" value={pan} onChange={setPan} placeholder="ABCDE1234F" />
          <Field label="Name as per PAN" value={panName} onChange={setPanName} placeholder="John Doe" />
          <Field label="Date of Birth" value={dob} onChange={setDob} placeholder="DD/MM/YYYY" />
        </ApiCard>

        {/* Verify GSTIN */}
        <ApiCard
          title="Verify GSTIN"
          method="POST"
          endpoint="/api/v1/onboarding/verify-gstin"
          description="Verifies GSTIN and fetches business registration details via Sandbox."
          onSubmit={() => authApi.verifyGstin(gstin)}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
        </ApiCard>

        {/* Verify Bank */}
        <ApiCard
          title="Verify Bank Account"
          method="POST"
          endpoint="/api/v1/onboarding/verify-bank"
          description="Penny-less verification — confirms the bank account exists and returns the account holder name."
          onSubmit={() => authApi.verifyBank(ifsc, account)}
        >
          <Field label="IFSC Code" value={ifsc} onChange={setIfsc} placeholder="SBIN0001234" />
          <Field label="Account Number" value={account} onChange={setAccount} placeholder="1234567890" />
        </ApiCard>

        {/* Aadhaar OTP generate */}
        <ApiCard
          title="Generate Aadhaar OTP"
          method="POST"
          endpoint="/api/v1/onboarding/aadhaar/generate-otp"
          description="Triggers an OTP to the mobile linked with the Aadhaar number. Returns reference_id for verification step."
          onSubmit={() => authApi.generateAadhaarOtp(aadhaar)}
        >
          <Field label="Aadhaar Number" value={aadhaar} onChange={setAadhaar} placeholder="1234 5678 9012" />
        </ApiCard>

        {/* Aadhaar OTP verify */}
        <ApiCard
          title="Verify Aadhaar OTP"
          method="POST"
          endpoint="/api/v1/onboarding/aadhaar/verify-otp"
          description="Verifies the Aadhaar OTP using the reference_id from the previous step."
          onSubmit={() => authApi.verifyAadhaarOtp(refId, aadhaarOtp)}
        >
          <Field label="Reference ID" value={refId} onChange={setRefId} placeholder="From generate-otp response" />
          <Field label="OTP" value={aadhaarOtp} onChange={setAOtp} placeholder="6-digit OTP" />
        </ApiCard>

        {/* Create Profile */}
        <ApiCard
          title="Create / Update Profile"
          method="POST"
          endpoint="/api/v1/onboarding/create-profile"
          description="Saves or updates the user's profile and financial details. All fields are optional except full_name, email, occupation."
          onSubmit={() => authApi.createProfile({
            full_name: fullName, email, occupation,
            pan_no: pan, gstin_no: gstin, cin_no: cinNo,
            tan_no: tanNo, ifsc_code: ifsc, account_no: account, adhaar_no: aadhaar
          })}
        >
          <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="John Doe" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="user@example.com" type="email" />
          <Field label="Occupation" value={occupation} onChange={setOccupation} placeholder="Business Owner" />
          <Field label="PAN (optional)" value={pan} onChange={setPan} placeholder="ABCDE1234F" />
          <Field label="GSTIN (optional)" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <Field label="Aadhaar (optional)" value={aadhaar} onChange={setAadhaar} placeholder="1234 5678 9012" />
          <Field label="CIN (optional)" value={cinNo} onChange={setCin} placeholder="U12345MH2020PTC123456" />
          <Field label="TAN (optional)" value={tanNo} onChange={setTan} placeholder="MUMU12345A" />
        </ApiCard>

        {/* Add pending request */}
        <ApiCard
          title="Add Pending Application Request"
          method="POST"
          endpoint="/api/v1/onboarding/add-request"
          description="Creates or resets a pending application request for admin approval."
          onSubmit={() => authApi.addRequest()}
        />
      </div>
    </div>
  );
}
