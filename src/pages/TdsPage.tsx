import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { b2bApi } from '@/api/b2bApi';
import { incomeTaxApi } from '@/api/incomeTaxApi';
import { Receipt } from 'lucide-react';

// Path slug Sandbox expects (no hyphen).
const CERT_TYPES = [
  { label: 'Form 16 (Salary TDS)',     value: 'form16'  },
  { label: 'Form 16A (Non-salary TDS)', value: 'form16a' },
];

// Quarterly statement form — distinct from the certificate type above.
const FORM_TYPES = [
  { label: '24Q (Salary)',        value: '24Q'  },
  { label: '26Q (Non-salary)',    value: '26Q'  },
  { label: '27Q (Non-resident)',  value: '27Q'  },
];

const QUARTERS = [
  { label: 'Q1 (Apr–Jun)', value: 'Q1' },
  { label: 'Q2 (Jul–Sep)', value: 'Q2' },
  { label: 'Q3 (Oct–Dec)', value: 'Q3' },
  { label: 'Q4 (Jan–Mar)', value: 'Q4' },
];

// Value carries the "FY " prefix the API expects (submit + fetch).
const FY_OPTIONS = ['2024-25', '2023-24', '2022-23'].map(v => ({ label: `FY ${v}`, value: `FY ${v}` }));

export default function TdsPage() {
  const [certType, setCertType]   = useState('form16');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [tan, setTan]             = useState('');
  const [form, setForm]           = useState('24Q');
  const [quarter, setQuarter]     = useState('Q1');
  const [fy, setFy]               = useState('FY 2024-25');
  const [bsr, setBsr]             = useState('');
  const [challanSerial, setChallan] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [challanAmount, setChallanAmount] = useState('');
  const [prn, setPrn]             = useState('');
  const [pan, setPan]             = useState('');
  const [panAmount, setPanAmount] = useState('');
  const [jobId, setJobId]         = useState('');

  const jobPayload = {
    username, password, tan,
    security_captcha: {
      quarter,
      financial_year: fy,
      form,
      bsr_code: bsr,
      challan_date: challanDate,
      challan_serial_no: challanSerial,
      challan_amount: Number(challanAmount),
      provisional_receipt_number: prn,
      // First row is the required header; second row is one PAN/amount entry.
      unique_pan_amount_combination_for_challan: [
        ['sr_no', 'pan', 'total_amount_deposited_against_pan'],
        [1, pan, Number(panAmount)],
      ],
    },
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="TDS — TRACES Compliance"
        subtitle="Fetch Form 16 / 16A from TRACES via Sandbox. Submit once → the server tracks the job in the background → check status with just the job id."
        icon={<Receipt size={18} />}
        badge="B2B Only"
        postmanSection="tds"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Submit Job (returns a job id immediately) → the server background-polls TRACES →
        Check Job Status / My TDS Jobs with just the id (no credentials). Manual poll &amp; Sandbox history search are below as fallbacks.
      </div>

      {/* B2C — an individual's TDS credits come from Form 26AS (not the deductor flow below). */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          B2C · Individual — Form 26AS (via AuthBridge)
        </p>
        <ApiCard
          title="My TDS Credits (Form 26AS)"
          method="GET"
          endpoint="/api/v1/income-tax/26as"
          description="B2C view: an individual's TDS credits from Form 26AS, keyed on their PAN. Serves Individual + Business plans (requireSegment). NOTE: returns a 'not configured' error until AUTHBRIDGE_* env + the 26AS endpoint spec are set."
          onSubmit={() => incomeTaxApi.getForm26AS(fy)}
        >
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
        </ApiCard>
      </div>

      <div className="space-y-4">
        <SelectField label="Certificate Type" value={certType} onChange={setCertType} options={CERT_TYPES} fullWidth />

        {/* 1. Submit */}
        <ApiCard
          step={1}
          title="Submit TDS Certificate Job"
          method="POST"
          endpoint={`/api/v1/b2b/tds/submit-job/${certType}`}
          description="Submits a TRACES job and returns a job id immediately (persisted + background-polled). 'Form' is the quarterly statement (24Q/26Q/…), separate from the certificate type."
          onSubmit={async () => {
            const res = await b2bApi.submitTdsJob(certType, jobPayload);
            const id = res.data?.data?.jobId;
            if (id) setJobId(id);
            return res;
          }}
        >
          <Field label="TRACES Username" value={username} onChange={setUsername} placeholder="TRACES portal username" />
          <Field label="TRACES Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMU12345A" />
          <SelectField label="Form (statement)" value={form} onChange={setForm} options={FORM_TYPES} />
          <SelectField label="Quarter" value={quarter} onChange={setQuarter} options={QUARTERS} />
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
          <Field label="BSR Code" value={bsr} onChange={setBsr} placeholder="Bank BSR code" />
          <Field label="Challan Date" value={challanDate} onChange={setChallanDate} placeholder="DD/MM/YYYY" />
          <Field label="Challan Serial No." value={challanSerial} onChange={setChallan} placeholder="Serial number" />
          <Field label="Challan Amount (₹)" value={challanAmount} onChange={setChallanAmount} placeholder="0" type="number" />
          <Field label="Provisional Receipt No." value={prn} onChange={setPrn} placeholder="15-digit PRN" />
          <Field label="PAN (deductee)" value={pan} onChange={setPan} placeholder="ABCDE1234F" />
          <Field label="Amount against PAN (₹)" value={panAmount} onChange={setPanAmount} placeholder="0" type="number" />
        </ApiCard>

        {/* 2. Check status — low input */}
        <ApiCard
          step={2}
          title="Check Job Status"
          method="GET"
          endpoint="/api/v1/b2b/tds/jobs/:jobId"
          description="Reads the persisted job's status + summary (processing | completed | failed). No credentials, no TRACES round-trip — the background cron keeps it updated."
          onSubmit={() => b2bApi.getTdsJob(jobId)}
        >
          <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="Auto-filled from Submit" fullWidth />
        </ApiCard>

        {/* 3. My jobs — history */}
        <ApiCard
          step={3}
          title="My TDS Jobs"
          method="GET"
          endpoint="/api/v1/b2b/tds/jobs"
          description="All your TDS jobs with their status + summary (newest first). The progress tracker / history."
          onSubmit={() => b2bApi.listTdsJobs()}
        />

        {/* Divider — fallbacks */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Fallbacks</p>
          <p className="text-xs text-slate-400 mb-3">Use these only if the background tracker can't proceed (e.g. Redis off) or to query TRACES history directly.</p>
        </div>

        {/* Manual poll */}
        <ApiCard
          step={4}
          title="Manual Poll (re-enter credentials)"
          method="POST"
          endpoint={`/api/v1/b2b/tds/poll-job/${certType}`}
          description="Forces a TRACES poll for a job id using freshly supplied credentials, and updates the stored job."
          onSubmit={() => b2bApi.pollTdsJob(certType, jobId, { username, password, tan })}
        >
          <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="From submit response" fullWidth />
          <Field label="TRACES Username" value={username} onChange={setUsername} placeholder="TRACES portal username" />
          <Field label="TRACES Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMU12345A" />
        </ApiCard>

        {/* Sandbox history search */}
        <ApiCard
          step={5}
          title="Fetch TDS History (TRACES search)"
          method="POST"
          endpoint={`/api/v1/b2b/tds/fetch-jobs/${certType}`}
          description="Searches past certificate jobs for this deductor directly on TRACES."
          onSubmit={() => b2bApi.fetchTdsJobs(certType, { tan, financial_year: fy, quarter, form })}
        >
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMU12345A" />
          <SelectField label="Form (statement)" value={form} onChange={setForm} options={FORM_TYPES} />
          <SelectField label="Quarter" value={quarter} onChange={setQuarter} options={QUARTERS} />
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
        </ApiCard>
      </div>
    </div>
  );
}
