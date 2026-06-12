import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { b2bApi } from '@/api/b2bApi';
import { Receipt } from 'lucide-react';

const CERT_TYPES = [
  { label: 'Form 16 (Salary TDS)', value: 'form-16' },
  { label: 'Form 16A (Non-salary TDS)', value: 'form-16a' },
];

const QUARTERS = [
  { label: 'Q1 (Apr–Jun)', value: 'Q1' },
  { label: 'Q2 (Jul–Sep)', value: 'Q2' },
  { label: 'Q3 (Oct–Dec)', value: 'Q3' },
  { label: 'Q4 (Jan–Mar)', value: 'Q4' },
];

const FY_OPTIONS = ['2024-25', '2023-24', '2022-23'].map(v => ({ label: `FY ${v}`, value: v }));

export default function TdsPage() {
  const [certType, setCertType]   = useState('form-16');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [tan, setTan]             = useState('');
  const [quarter, setQuarter]     = useState('Q1');
  const [fy, setFy]               = useState('2024-25');
  const [bsr, setBsr]             = useState('');
  const [challanSerial, setChallan] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [challanAmount, setChallanAmount] = useState('');
  const [jobId, setJobId]         = useState('');

  const jobPayload = {
    username, password, tan,
    security_captcha: {
      quarter, financial_year: fy,
      form: certType === 'form-16' ? '16' : '16A',
      bsr_code: bsr,
      challan_date: challanDate,
      challan_serial_no: challanSerial,
      challan_amount: Number(challanAmount),
      provisional_receipt_number: '',
    },
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="TDS — TRACES Compliance"
        subtitle="Fetch Form 16 / Form 16A certificates from TRACES via Sandbox. Requires TRACES credentials."
        icon={<Receipt size={18} />}
        badge="B2B Only"
        postmanSection="tds"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Submit Job → copy job_id → Poll Job until status is ready → Fetch Jobs for history.
      </div>

      <div className="space-y-4">
        <SelectField label="Certificate Type" value={certType} onChange={setCertType} options={CERT_TYPES} fullWidth />

        {/* Submit */}
        <ApiCard
          title="Submit TDS Certificate Job"
          method="POST"
          endpoint={`/api/v1/b2b/tds/submit-job/${certType}`}
          description="Submits a job to TRACES for certificate generation. Returns a job_id."
          onSubmit={() => b2bApi.submitTdsJob(certType, jobPayload)}
        >
          <Field label="TRACES Username" value={username} onChange={setUsername} placeholder="TRACES portal username" />
          <Field label="TRACES Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMU12345A" />
          <SelectField label="Quarter" value={quarter} onChange={setQuarter} options={QUARTERS} />
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
          <Field label="BSR Code" value={bsr} onChange={setBsr} placeholder="Bank BSR code" />
          <Field label="Challan Date" value={challanDate} onChange={setChallanDate} placeholder="DD/MM/YYYY" />
          <Field label="Challan Serial No." value={challanSerial} onChange={setChallan} placeholder="Serial number" />
          <Field label="Challan Amount (₹)" value={challanAmount} onChange={setChallanAmount} placeholder="0" type="number" />
        </ApiCard>

        {/* Poll */}
        <ApiCard
          title="Poll TDS Job Status"
          method="POST"
          endpoint={`/api/v1/b2b/tds/poll-job/${certType}`}
          description="Checks the status of a submitted TDS job. Keep polling until status is completed."
          onSubmit={() => b2bApi.pollTdsJob(certType, jobId, { username, password, tan })}
        >
          <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="From submit response" fullWidth />
          <Field label="TRACES Username" value={username} onChange={setUsername} placeholder="TRACES portal username" />
          <Field label="TRACES Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMU12345A" />
        </ApiCard>

        {/* Fetch jobs */}
        <ApiCard
          title="Fetch TDS Job History"
          method="POST"
          endpoint={`/api/v1/b2b/tds/fetch-jobs/${certType}`}
          description="Searches past TDS certificate jobs for this deductor."
          onSubmit={() => b2bApi.fetchTdsJobs(certType, { username, password, tan, quarter, financial_year: fy })}
        >
          <Field label="TRACES Username" value={username} onChange={setUsername} placeholder="TRACES portal username" />
          <Field label="TRACES Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMU12345A" />
          <SelectField label="Quarter" value={quarter} onChange={setQuarter} options={QUARTERS} />
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
        </ApiCard>
      </div>
    </div>
  );
}
