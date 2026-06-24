import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { b2bApi } from '@/api/b2bApi';
import { FileText } from 'lucide-react';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(2000, i).toLocaleString('en', { month: 'long' }),
  value: String(i + 1).padStart(2, '0'),
}));

const YEARS = ['2024', '2025', '2026'].map(y => ({ label: y, value: y }));
const FY_OPTIONS = ['2024-25', '2023-24', '2022-23'].map(v => ({ label: `FY ${v}`, value: v }));
const FORM_TYPES = [
  { label: 'GSTR-1',  value: 'GSTR-1'  },
  { label: 'GSTR-1A', value: 'GSTR-1A' },
  { label: 'GSTR-3B', value: 'GSTR-3B' },
  { label: 'GSTR-9',  value: 'GSTR-9'  },
  { label: 'GSTR-9C', value: 'GSTR-9C' },
];

// OTP request `type` (server enum, no hyphen)
const OTP_TYPES = [
  { label: 'GSTR1',  value: 'GSTR1'  },
  { label: 'GSTR1A', value: 'GSTR1A' },
  { label: 'GSTR3B', value: 'GSTR3B' },
  { label: 'GSTR9',  value: 'GSTR9'  },
  { label: 'GSTR9C', value: 'GSTR9C' },
];

// Comprehensive summary `:type` path param (lowercase)
const SUMMARY_TYPES = [
  { label: 'GSTR-1',  value: 'gstr1'  },
  { label: 'GSTR-1A', value: 'gstr1a' },
  { label: 'GSTR-3B', value: 'gstr3b' },
  { label: 'GSTR-9',  value: 'gstr9'  },
  { label: 'GSTR-9C', value: 'gstr9c' },
];

export default function GstTaxpayerPage() {
  const [username, setUsername]   = useState('');
  const [gstin, setGstin]         = useState('');
  const [otp, setOtp]             = useState('');
  const [tpToken, setTpToken]     = useState('');
  const [year, setYear]           = useState('2024');
  const [month, setMonth]         = useState('04');
  const [fy, setFy]               = useState('2024-25');
  const [formType, setFormType]   = useState('GSTR-1');
  const [period, setPeriod]       = useState('');
  const [otpType, setOtpType]     = useState('GSTR1');
  const [otpTitle, setOtpTitle]   = useState('');
  const [summaryType, setSummaryType] = useState('gstr1');
  const [retPeriod, setRetPeriod] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="GST Taxpayer Portal"
        subtitle="GST runs on WhiteBooks (GSP). Flow: OTP → verify → refresh → fetch GSTR-1 data → mark as filed."
        icon={<FileText size={18} />}
        badge="B2B Only"
        postmanSection="gst"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Step 1 Generate OTP → Step 2 Verify OTP (copy <code>taxpayer_token</code>) → Step 3 Use token in GSTR-1 calls.
        <div className="mt-1 text-blue-600/80">
          Provider: <strong>WhiteBooks</strong>. The server supplies email / IP / state-code / txn (env: <code>WHITEBOOKS_EMAIL</code>, <code>WHITEBOOKS_IP</code>, <code>WHITEBOOKS_BASE_URL</code>, <code>WHITEBOOKS_CLIENT_ID/SECRET</code>); you only pass username, GSTIN and OTP.
        </div>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="relative">
          <div className="absolute -left-3 top-4 w-6 h-6 bg-[#1A73E8] rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
          <ApiCard
            title="Generate GST Portal OTP"
            method="POST"
            endpoint="/api/v1/b2b/gst/otp"
            description="Sends OTP to the mobile/email registered with the GST portal. type (return type) is required by the server; title is an optional label."
            onSubmit={() => b2bApi.generateGstOtp(username, gstin, otpType, otpTitle || undefined)}
          >
            <Field label="GST Portal Username" value={username} onChange={setUsername} placeholder="GST portal username" />
            <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
            <SelectField label="Type" value={otpType} onChange={setOtpType} options={OTP_TYPES} />
            <Field label="Title (optional)" value={otpTitle} onChange={setOtpTitle} placeholder="e.g. Q1 filing" />
          </ApiCard>
        </div>

        {/* Step 2 */}
        <div className="relative">
          <div className="absolute -left-3 top-4 w-6 h-6 bg-[#1A73E8] rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
          <ApiCard
            title="Verify GST Portal OTP"
            method="POST"
            endpoint="/api/v1/b2b/gst/otp/verify"
            description="Verifies OTP and returns a taxpayer_token. Copy the token for all subsequent calls."
            onSubmit={() => b2bApi.verifyGstOtp(username, gstin, otp)}
          >
            <Field label="GST Portal Username" value={username} onChange={setUsername} placeholder="GST portal username" />
            <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
            <Field label="OTP" value={otp} onChange={setOtp} placeholder="OTP from GST portal" />
          </ApiCard>
        </div>

        {/* Refresh session */}
        <ApiCard
          title="Refresh Taxpayer Session"
          method="POST"
          endpoint="/api/v1/b2b/gst/session/refresh"
          description="Refreshes the taxpayer_token before it expires."
          onSubmit={() => b2bApi.refreshGstSession(tpToken)}
        >
          <Field label="Taxpayer Token" value={tpToken} onChange={setTpToken} placeholder="Paste token from verify-otp" fullWidth />
        </ApiCard>

        {/* GSTR-1 Summary */}
        <ApiCard
          title="Get GSTR-1 Summary"
          method="POST"
          endpoint="/api/v1/b2b/gst/gstr1/summary"
          description="Fetches GSTR-1 summary for a return period and generates a downloadable PDF."
          onSubmit={() => b2bApi.getGstr1Summary(tpToken, gstin, year, month)}
        >
          <Field label="Taxpayer Token" value={tpToken} onChange={setTpToken} placeholder="Paste token from verify-otp" fullWidth />
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <SelectField label="Year" value={year} onChange={setYear} options={YEARS} />
          <SelectField label="Month" value={month} onChange={setMonth} options={MONTHS} />
        </ApiCard>

        {/* GSTR-1 B2B */}
        <ApiCard
          title="Get GSTR-1 B2B Invoices"
          method="POST"
          endpoint="/api/v1/b2b/gst/gstr1/b2b"
          description="Fetches B2B invoice details from GSTR-1 for a given period."
          onSubmit={() => b2bApi.getGstr1B2b(tpToken, gstin, year, month)}
        >
          <Field label="Taxpayer Token" value={tpToken} onChange={setTpToken} placeholder="Paste token from verify-otp" fullWidth />
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <SelectField label="Year" value={year} onChange={setYear} options={YEARS} />
          <SelectField label="Month" value={month} onChange={setMonth} options={MONTHS} />
        </ApiCard>

        {/* Comprehensive Summary */}
        <ApiCard
          title="Get Return Summary (GSTR-1/1A/3B/9/9C)"
          method="POST"
          endpoint="/api/v1/b2b/gst/summary/:type"
          description="One return type's summary. ret_period is MMYYYY (e.g. 042026). Type is a path param."
          onSubmit={() => b2bApi.getGstSummary(summaryType, { taxpayer_token: tpToken, gstin, ret_period: retPeriod })}
        >
          <SelectField label="Type" value={summaryType} onChange={setSummaryType} options={SUMMARY_TYPES} />
          <Field label="Taxpayer Token" value={tpToken} onChange={setTpToken} placeholder="Paste token from verify-otp" fullWidth />
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <Field label="Return Period (MMYYYY)" value={retPeriod} onChange={setRetPeriod} placeholder="e.g. 042026" />
        </ApiCard>

        {/* Sales Summary */}
        <ApiCard
          title="Get Annual Sales Summary"
          method="GET"
          endpoint="/api/v1/b2b/gst/sales-summary"
          description="Calculates monthly sales breakdown across 12 months of a financial year. Makes up to 12 WhiteBooks calls."
          onSubmit={() => b2bApi.getSalesSummary(gstin, fy, tpToken)}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
          <Field label="Taxpayer Token" value={tpToken} onChange={setTpToken} placeholder="Paste token from verify-otp" fullWidth />
        </ApiCard>

        {/* Mark as filed */}
        <ApiCard
          title="Mark Return as Filed"
          method="POST"
          endpoint="/api/v1/b2b/gst/mark-as-filed"
          description="Marks a GST form as filed for this user, stopping cron notifications for that period."
          onSubmit={() => b2bApi.markAsFiled(gstin, formType, period)}
        >
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="29ABCDE1234F1Z5" />
          <SelectField label="Form Type" value={formType} onChange={setFormType} options={FORM_TYPES} />
          <Field label="Period" value={period} onChange={setPeriod} placeholder="MM-YYYY e.g. 04-2024" />
        </ApiCard>
      </div>
    </div>
  );
}
