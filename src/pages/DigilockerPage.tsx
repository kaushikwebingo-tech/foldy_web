import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { digilockerApi } from '@/api/digilockerApi';
import { HardDrive } from 'lucide-react';

const DOC_TYPES = [
  { label: 'Aadhaar (ADHAR)', value: 'ADHAR' },
  { label: 'PAN (PANCR)',     value: 'PANCR' },
  { label: 'Driving Licence (DRIVLC)', value: 'DRIVLC' },
  { label: 'Vehicle RC (VHCLRC)', value: 'VHCLRC' },
];

const FLOW_OPTIONS = [
  { label: 'Sign In (existing account)', value: 'signin' },
  { label: 'Sign Up (create account)',   value: 'signup' },
];

export default function DigilockerPage() {
  const [aadhaar, setAadhaar]       = useState('');
  const [mobile, setMobile]         = useState('');
  const [docType, setDocType]       = useState('ADHAR');
  const [redirectUrl, setRedirect]  = useState('http://localhost:3000/digilocker');
  const [flow, setFlow]             = useState('signin');
  const [sessionId, setSessionId]   = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="DigiLocker"
        subtitle="KYC document fetch via DigiLocker. Initiate session, check status, fetch government documents."
        icon={<HardDrive size={18} />}
        badge="Public"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Verify Account → Initiate Session (get session_id) → Open DigiLocker URL in browser → Get Session Status → Fetch Documents.
      </div>

      <div className="space-y-4">
        {/* Verify account */}
        <ApiCard
          title="Verify DigiLocker Account"
          method="POST"
          endpoint="/api/v1/digilocker/verify-account"
          description="Checks if a DigiLocker account exists for the given Aadhaar number or mobile."
          onSubmit={() => digilockerApi.verifyAccount(aadhaar || undefined, mobile || undefined)}
        >
          <Field label="Aadhaar Number (optional)" value={aadhaar} onChange={setAadhaar} placeholder="1234 5678 9012" />
          <Field label="Mobile Number (optional)" value={mobile} onChange={setMobile} placeholder="9876543210" />
        </ApiCard>

        {/* Initiate session */}
        <ApiCard
          title="Initiate DigiLocker Session"
          method="POST"
          endpoint="/api/v1/digilocker/initiate-session"
          description="Creates a DigiLocker session. The response includes a URL the user must visit to authorise document access."
          onSubmit={() => digilockerApi.initiateSession([docType], redirectUrl, flow)}
        >
          <SelectField label="Document Type" value={docType} onChange={setDocType} options={DOC_TYPES} />
          <SelectField label="Flow" value={flow} onChange={setFlow} options={FLOW_OPTIONS} />
          <Field label="Redirect URL" value={redirectUrl} onChange={setRedirect} placeholder="http://localhost:3000/digilocker" fullWidth />
        </ApiCard>

        {/* Session status */}
        <ApiCard
          title="Get Session Status"
          method="GET"
          endpoint="/api/v1/digilocker/session/:id/status"
          description="Checks if the user has completed DigiLocker authorisation."
          onSubmit={() => digilockerApi.getSessionStatus(sessionId)}
        >
          <Field label="Session ID" value={sessionId} onChange={setSessionId} placeholder="From initiate-session response" fullWidth />
        </ApiCard>

        {/* User profile */}
        <ApiCard
          title="Get DigiLocker User Profile"
          method="GET"
          endpoint="/api/v1/digilocker/session/:id/profile"
          description="Returns the user's DigiLocker profile after authorisation is complete."
          onSubmit={() => digilockerApi.getUserProfile(sessionId)}
        >
          <Field label="Session ID" value={sessionId} onChange={setSessionId} placeholder="From initiate-session response" fullWidth />
        </ApiCard>

        {/* Get document */}
        <ApiCard
          title="Fetch Document"
          method="GET"
          endpoint="/api/v1/digilocker/session/:id/document/:type"
          description="Fetches the actual document (e.g. Aadhaar, PAN) from the user's DigiLocker after authorisation."
          onSubmit={() => digilockerApi.getDocument(sessionId, docType)}
        >
          <Field label="Session ID" value={sessionId} onChange={setSessionId} placeholder="From initiate-session response" />
          <SelectField label="Document Type" value={docType} onChange={setDocType} options={DOC_TYPES} />
        </ApiCard>
      </div>
    </div>
  );
}
