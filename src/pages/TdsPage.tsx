import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { b2bApi } from '@/api/b2bApi';
import { Receipt } from 'lucide-react';

/*
 * `:form` on /b2b/tds/certificates/:form. The server accepts ONLY "130" or "131"
 * and 400s on anything else, so the old `form16` / `form16a` slugs are gone: they
 * were the pre-2026-09 path segment and every call carrying them was refused.
 */
const CERT_TYPES = [
  { label: '130 — Salary TDS (was Form 16)',      value: '130' },
  { label: '131 — Other TDS (was Form 16A)',      value: '131' },
];

// Quarterly statement form — distinct from the certificate type above.
const FORM_TYPES = [
  { label: '24Q (Salary)',        value: '24Q'  },
  { label: '26Q (Non-salary)',    value: '26Q'  },
];

const QUARTERS = [
  { label: 'Q1 (Apr–Jun)', value: 'Q1' },
  { label: 'Q2 (Jul–Sep)', value: 'Q2' },
  { label: 'Q3 (Oct–Dec)', value: 'Q3' },
  { label: 'Q4 (Jan–Mar)', value: 'Q4' },
];

// Value carries the "FY " prefix the calculator + potential-notice routes expect.
const FY_OPTIONS = ['2025-26','2024-25', '2023-24', '2022-23','2021-22'].map(v => ({ label: `FY ${v}`, value: `FY ${v}` }));

/*
 * The CERTIFICATE routes take "TY 2025-26", not "FY 2025-26" — Sandbox rejects the
 * FY form outright, so the server pins the pattern and refuses it before a credit
 * is spent. Two separate lists rather than one, because one list is how a stale
 * value reaches the route that charges.
 */
const TY_OPTIONS = ['2025-26','2024-25', '2023-24', '2022-23','2021-22'].map(v => ({ label: `TY ${v}`, value: `TY ${v}` }));

// ── TDS Calculator option lists (mirror Sandbox docs) ──
const DEDUCTEE_TYPES = [
  'individual', 'huf', 'company', 'firm', 'trust', 'local_authority',
  'body_of_individuals', 'association_of_persons', 'artificial_judicial_person',
].map(v => ({ label: v.replace(/_/g, ' '), value: v }));

const RESIDENTIAL_STATUS = [
  { label: 'Resident', value: 'resident' },
  { label: 'Non-resident', value: 'non_resident' },
];

const BOOL_OPTIONS = [
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
];

// A common subset — nature_of_payment is a free string server-side (Sandbox owns the full enum).
const NATURE_OF_PAYMENT = [
  'sales_and_marketing_services', 'fees_for_technical_service', 'professional_fees',
  'rent_of_plant_and_machinery', 'rent_of_land_or_building', 'commission_or_brokerage',
  'winnings_from_online_games', 'tender_fees', 'cash_withdrawal',
  'interest_payment_from_indian_company_or_business_trust',
].map(v => ({ label: v.replace(/_/g, ' '), value: v }));

// Builds the full ~46-field salary map Sandbox expects, zero-filled with the
// key figures overridden from the form. Reused by the sync + bulk cards.
function buildSalary(o: {
  panStatus: string; employeeCategory: string; salary171: string;
  stdDeduction: string; hraExemption: string; housePropertyIncome: string; deductible80c: string;
}): Record<string, string | number> {
  const n = (v: string) => Number(v || 0);
  return {
    pan_status: o.panStatus,
    employee_category: o.employeeCategory,
    gross_salary_from_previous_employers: 0,
    tds_by_previous_employers: 0,
    salary_as_per_provisions_contained_in_section_17_1: n(o.salary171),
    value_of_perquisites_us_17_2: 0,
    profits_in_lieu_of_salary_us_17_3: 0,
    travel_concession_or_assistance_us_10_5: 0,
    death_cum_retirement_gratuity_us_10_10: 0,
    commuted_value_of_pension_us_10_10_a: 0,
    cash_equivalent_of_leave_salary_encashment_us_10_10_aa: 0,
    house_rent_allowance_us_10_13_a: n(o.hraExemption),
    other_special_allowances_under_section_10_14: 0,
    total_amount_of_any_other_exemption_us_10: 0,
    standard_deduction_us_16_ia: n(o.stdDeduction),
    entertainment_allowance_us_16_ii: 0,
    tax_on_employment_us_16_iii: 0,
    income_from_house_property_reported_by_employee_offered_for_tds: n(o.housePropertyIncome),
    income_under_the_head_other_sources_offered_for_tds: 0,
    gross_amount_us_80_c: n(o.deductible80c),
    deductible_amount_us_80_c: n(o.deductible80c),
    gross_amount_us_80_ccc: 0, deductible_amount_us_80_ccc: 0,
    gross_amount_us_80_ccd_1: 0, deductible_amount_us_80_ccd_1: 0,
    gross_amount_us_80_ccd_1_b: 0, deductible_amount_us_80_ccd_1_b: 0,
    gross_amount_us_80_ccd_2: 0, deductible_amount_us_80_ccd_2: 0,
    gross_amount_us_80_ccg: 0, deductible_amount_us_80_ccg: 0,
    gross_amount_us_80_cch: 0, deductible_amount_us_80_cch: 0,
    gross_amount_us_80_d: 0, deductible_amount_us_80_d: 0,
    gross_amount_us_80_e: 0, deductible_amount_us_80_e: 0,
    gross_amount_us_80_g: 0, deductible_amount_us_80_g: 0, qualifying_amount_us_80_g: 0,
    gross_amount_us_80_tta: 0, deductible_amount_us_80_tta: 0, qualifying_amount_us_80_tta: 0,
    gross_amount_for_other_deductions: 0,
    deductible_amount_for_other_deductions: 0,
    qualifying_amount_for_other_deductions: 0,
  };
}

export default function TdsPage() {
  const [certType, setCertType]   = useState('130');
  const [taxYear, setTaxYear]     = useState('TY 2025-26');
  const [profileId, setProfileId] = useState('');
  const [tan, setTan]             = useState('');
  const [form, setForm]           = useState('24Q');
  const [quarter, setQuarter]     = useState('Q1');
  const [fy, setFy]               = useState('FY 2025-26');
  const [jobId, setJobId]         = useState('');
  const [pnJobId, setPnJobId]     = useState('');

  // ── TDS Calculator state ──
  const [deducteeType, setDeducteeType]       = useState('individual');
  const [natureOfPayment, setNatureOfPayment] = useState('sales_and_marketing_services');
  const [residential, setResidential]         = useState('resident');
  const [isPanAvailable, setPanAvailable]     = useState('true');
  const [isPanOperative, setPanOperative]     = useState('true');
  const [is206ab, setIs206ab]                 = useState('false');
  const [creditAmount, setCreditAmount]       = useState('250000');
  const [creditDate, setCreditDate]           = useState('2024-11-07'); // yyyy-mm-dd → epoch ms
  // salary
  const [panStatus, setPanStatus]             = useState('PANISVALID');
  const [employeeCategory, setEmployeeCategory] = useState('general');
  const [salary171, setSalary171]             = useState('750000');
  const [stdDeduction, setStdDeduction]       = useState('50000');
  const [hraExemption, setHraExemption]       = useState('0');
  const [housePropertyIncome, setHousePropertyIncome] = useState('346500');
  const [deductible80c, setDeductible80c]     = useState('0');
  const [bulkJobId, setBulkJobId]             = useState('');

  const toEpochMs = (yyyyMmDd: string) => {
    const t = new Date(yyyyMmDd).getTime();
    return Number.isNaN(t) ? 0 : t;
  };
  const salaryPayload = () => ({
    financial_year: fy,
    salary: buildSalary({ panStatus, employeeCategory, salary171, stdDeduction, hraExemption, housePropertyIncome, deductible80c }),
  });

  /*
   * `jobPayload` is gone with the route that took it. The certificate job used to
   * carry the TRACES username, password and the whole challan block; the 2026-09
   * restructure moved the login onto the saved TDS profile, so the body is now
   * quarter + tax_year (+ optional profileId) and those eleven fields had no
   * receiver anywhere on the server.
   */

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="TDS — TRACES Compliance"
        subtitle="Fetch TDS certificates from TRACES via Sandbox. Submit once → the Sandbox WEBHOOK reports completion → read the status and the certificate links with just the job id. Restructured 2026-09: /certificates/:form (130 or 131), and the credentials live on the saved profile."
        icon={<Receipt size={18} />}
        badge="B2B Only"
        postmanSection="tds"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Submit Job (202 + a job id) → <strong>the Sandbox webhook</strong> (POST /webhook/sandbox/tds) advances it —
        there is no polling route and no polling cron → Check Job Status / My TDS Jobs / Certificate Links with just the id, no credentials.
        Refresh One Job is the escape hatch for a missed webhook, not a loop; the provider history search is below it.
      </div>

      <div className="mb-4 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
        Looking for ITR or Form 26AS? Those live in the separate <strong>Income Tax</strong> module.
      </div>

      <div className="space-y-4">
        <SelectField label="Certificate Type" value={certType} onChange={setCertType} options={CERT_TYPES} fullWidth />

        {/* 1. Submit */}
        <ApiCard
          step={1}
          title="Submit TDS Certificate Job"
          method="POST"
          endpoint={`/api/v1/b2b/tds/certificates/${certType}`}
          description="Three fields, not fourteen. The 2026-09 Sandbox restructure moved this to /certificates/:form (130 = salary TDS, 131 = other TDS) and took the TRACES credentials and the whole challan block out of the body — the saved TDS profile supplies the login, so send only quarter + tax_year (+ an optional profileId). tax_year is 'TY 2025-26'; the server refuses 'FY …' rather than spend a credit on a guaranteed provider 400. Returns 202 with a jobId; completion arrives on the webhook."
          onSubmit={async () => {
            const res = await b2bApi.submitTdsJob(certType, {
              quarter,
              tax_year: taxYear,
              ...(profileId.trim() ? { profileId: profileId.trim() } : {}),
            });
            const id = res.data?.data?.jobId;
            if (id) setJobId(id);
            return res;
          }}
        >
          <SelectField label="Quarter" value={quarter} onChange={setQuarter} options={QUARTERS} />
          <SelectField label="Tax Year" value={taxYear} onChange={setTaxYear} options={TY_OPTIONS} />
          <Field label="Profile ID (optional)" value={profileId} onChange={setProfileId} placeholder="defaults to your default TDS profile" fullWidth />
        </ApiCard>

        {/* 2. Check status — low input */}
        <ApiCard
          step={2}
          title="Check Job Status"
          method="GET"
          endpoint="/api/v1/b2b/tds/jobs/:jobId"
          description="Reads the persisted job's status + summary. No credentials and no TRACES round-trip: the Sandbox webhook advances it, not a cron and not this read."
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

        {/* Refresh one job — the missed-webhook escape hatch */}
        <ApiCard
          step={4}
          title="Refresh One Job (missed webhook)"
          method="POST"
          endpoint="/api/v1/b2b/tds/jobs/:jobId/refresh"
          description="Re-reads one job's state on demand. There is NO polling route and no polling cron — completion arrives on the Sandbox webhook (POST /webhook/sandbox/tds); this is the escape hatch for a job whose webhook was missed, not a loop to call. No credentials: the saved profile supplies the login."
          onSubmit={() => b2bApi.refreshTdsJob(jobId.trim())}
        >
          <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="From submit response" fullWidth />
        </ApiCard>

        {/* Presigned certificate links */}
        <ApiCard
          step={5}
          title="Certificate Links"
          method="GET"
          endpoint="/api/v1/b2b/tds/jobs/:jobId/certificates"
          description="Presigned links to the PDFs mirrored into our own storage. Empty while TRACES is still preparing the files — an empty list is the normal in-progress answer, not an error."
          onSubmit={() => b2bApi.getTdsJobCertificates(jobId.trim())}
        >
          <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="From submit response" fullWidth />
        </ApiCard>

        {/* Sandbox history search */}
        <ApiCard
          step={6}
          title="Fetch TDS History (TRACES search)"
          method="POST"
          endpoint={`/api/v1/b2b/tds/certificates/${certType}/search`}
          description="Reads the PROVIDER's own job list for this deductor rather than ours; free, no credit. tan, tax_year and quarter are all required — `financial_year` and the statement form are not fields on this route."
          onSubmit={() => b2bApi.fetchTdsJobs(certType, { tan, tax_year: taxYear, quarter })}
        >
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMU12345A" />
          <SelectField label="Quarter" value={quarter} onChange={setQuarter} options={QUARTERS} />
          <SelectField label="Tax Year" value={taxYear} onChange={setTaxYear} options={TY_OPTIONS} />
        </ApiCard>

        {/* Divider — Connect Account & Potential Notices */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Connect Account &amp; Potential Notices</p>
          <p className="text-xs text-slate-400 mb-3">Link the deductor TAN once (reused as the default across flows), then run async "potential notices" analytics — no TRACES credentials needed.</p>
        </div>

        {/* Link TAN */}
        <ApiCard
          step={7}
          title="Link TDS TAN (Connect Account)"
          method="POST"
          endpoint="/api/v1/b2b/tds/link-tan"
          description="Validates + persists the deductor TAN on your finance profile (no provider verify). Becomes the default TAN for the certificate + potential-notice flows."
          onSubmit={() => b2bApi.linkTdsTan(tan)}
        >
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMB01234F" fullWidth />
        </ApiCard>

        {/* Get linked TAN */}
        <ApiCard
          step={8}
          title="Get Linked TAN"
          method="GET"
          endpoint="/api/v1/b2b/tds/tan"
          description="Reads the deductor TAN linked on your finance profile (low input)."
          onSubmit={() => b2bApi.getTdsTan()}
        />

        {/* Submit potential notice */}
        <ApiCard
          step={9}
          title="Submit Potential Notice"
          method="POST"
          endpoint="/api/v1/b2b/tds/potential-notices"
          description="Async TDS analytics — returns a job id immediately; the server background-polls Sandbox. Costs 1 TDS credit (refunded on failure)."
          onSubmit={async () => {
            const res = await b2bApi.submitTdsPotentialNotice({ tan, quarter, form, financial_year: fy });
            const id = res.data?.data?.job_id ?? res.data?.data?.jobId;
            if (id) setPnJobId(id);
            return res;
          }}
        >
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMB01234F" />
          <SelectField label="Form (statement)" value={form} onChange={setForm} options={FORM_TYPES} />
          <SelectField label="Quarter" value={quarter} onChange={setQuarter} options={QUARTERS} />
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
        </ApiCard>

        {/* Potential notice status */}
        <ApiCard
          step={10}
          title="Potential Notice Status"
          method="GET"
          endpoint="/api/v1/b2b/tds/potential-notices?job_id="
          description="Reads the analysis status + parsed notices for a job id (background-polled, no creds)."
          onSubmit={() => b2bApi.getTdsPotentialNoticeStatus(pnJobId)}
        >
          <Field label="Job ID" value={pnJobId} onChange={setPnJobId} placeholder="Auto-filled from Submit" fullWidth />
        </ApiCard>

        {/* Search potential notices */}
        <ApiCard
          step={11}
          title="Search Potential Notices (Sandbox history)"
          method="POST"
          endpoint="/api/v1/b2b/tds/potential-notices/search"
          description="Searches past potential-notice analyses for this deductor directly on Sandbox."
          onSubmit={() => b2bApi.searchTdsPotentialNotices({ tan, quarter, form, financial_year: fy, page_size: 10 })}
        >
          <Field label="TAN" value={tan} onChange={setTan} placeholder="MUMB01234F" />
          <SelectField label="Form (statement)" value={form} onChange={setForm} options={FORM_TYPES} />
          <SelectField label="Quarter" value={quarter} onChange={setQuarter} options={QUARTERS} />
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
        </ApiCard>

        {/* Divider — TDS Calculator */}
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">TDS Calculator</p>
          <p className="text-xs text-slate-400 mb-3">Compute the TDS payable on a payment — no TRACES credentials. Non-salary &amp; salary (sync) answer immediately; the bulk salary flow submits a job then polls for an xlsx. Shared across B2B + B2C. Each compute costs 1 TDS credit (refunded on failure).</p>
        </div>

        {/* 11. Non-salary calculator */}
        <ApiCard
          step={12}
          title="Calculator — Non-Salary TDS"
          method="POST"
          endpoint="/api/v1/b2b/tds/calculator/non-salary"
          description="Synchronous TDS on one non-salary payment. Returns section, rate, deduction & due date."
          onSubmit={() => b2bApi.calcTdsNonSalary({
            deductee_type: deducteeType,
            is_pan_available: isPanAvailable === 'true',
            residential_status: residential,
            is_206ab_applicable: is206ab === 'true',
            is_pan_operative: isPanOperative === 'true',
            nature_of_payment: natureOfPayment,
            credit_amount: Number(creditAmount),
            credit_date: toEpochMs(creditDate),
          })}
        >
          <SelectField label="Deductee Type" value={deducteeType} onChange={setDeducteeType} options={DEDUCTEE_TYPES} />
          <SelectField label="Nature of Payment" value={natureOfPayment} onChange={setNatureOfPayment} options={NATURE_OF_PAYMENT} />
          <SelectField label="Residential Status" value={residential} onChange={setResidential} options={RESIDENTIAL_STATUS} />
          <SelectField label="PAN Available?" value={isPanAvailable} onChange={setPanAvailable} options={BOOL_OPTIONS} />
          <SelectField label="PAN Operative?" value={isPanOperative} onChange={setPanOperative} options={BOOL_OPTIONS} />
          <SelectField label="206AB Applicable?" value={is206ab} onChange={setIs206ab} options={BOOL_OPTIONS} />
          <Field label="Credit Amount (₹)" value={creditAmount} onChange={setCreditAmount} placeholder="0" type="number" />
          <Field label="Credit Date" value={creditDate} onChange={setCreditDate} placeholder="YYYY-MM-DD" type="date" />
        </ApiCard>

        {/* 12. Salary calculator (sync) */}
        <ApiCard
          step={13}
          title="Calculator — Salary TDS (sync)"
          method="POST"
          endpoint="/api/v1/b2b/tds/calculator/salary/sync"
          description="Synchronous TDS on one salary — returns both new- and old-regime figures (income_tax_payable, tds_on_salary, cess, relief 87A)."
          onSubmit={() => b2bApi.calcTdsSalarySync(salaryPayload())}
        >
          <SelectField label="Financial Year" value={fy} onChange={setFy} options={FY_OPTIONS} />
          <Field label="PAN Status" value={panStatus} onChange={setPanStatus} placeholder="PANISVALID" />
          <Field label="Employee Category" value={employeeCategory} onChange={setEmployeeCategory} placeholder="general" />
          <Field label="Salary u/s 17(1) (₹)" value={salary171} onChange={setSalary171} placeholder="0" type="number" />
          <Field label="Standard Deduction 16(ia) (₹)" value={stdDeduction} onChange={setStdDeduction} placeholder="0" type="number" />
          <Field label="HRA Exemption 10(13A) (₹)" value={hraExemption} onChange={setHraExemption} placeholder="0" type="number" />
          <Field label="House Property Income (₹)" value={housePropertyIncome} onChange={setHousePropertyIncome} placeholder="0" type="number" />
          <Field label="80C Deductible (₹)" value={deductible80c} onChange={setDeductible80c} placeholder="0" type="number" />
        </ApiCard>

        {/* 13. Salary calculator (bulk submit) */}
        <ApiCard
          step={14}
          title="Calculator — Salary TDS bulk (submit)"
          method="POST"
          endpoint="/api/v1/b2b/tds/calculator/salary"
          description="Submits a bulk salary TDS job (server uploads the workbook) and returns a job_id. Uses the same salary form above. Poll it below."
          onSubmit={async () => {
            const res = await b2bApi.submitTdsSalaryBulk(salaryPayload());
            const id = res.data?.data?.data?.job_id ?? res.data?.data?.job_id;
            if (id) setBulkJobId(id);
            return res;
          }}
        />

        {/* 14. Salary calculator (bulk status) */}
        <ApiCard
          step={15}
          title="Calculator — Salary TDS bulk (status)"
          method="GET"
          endpoint="/api/v1/b2b/tds/calculator/salary?job_id="
          description="Polls the bulk job. status: created|queued|succeeded|failed; when succeeded, data.tds_on_salary_workbook_url is the xlsx result. No charge."
          onSubmit={() => b2bApi.getTdsSalaryBulkStatus(bulkJobId)}
        >
          <Field label="Job ID" value={bulkJobId} onChange={setBulkJobId} placeholder="Auto-filled from Submit" fullWidth />
        </ApiCard>
      </div>
    </div>
  );
}
