import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { reportsApi } from '@/api/reportsApi';
import { homeApi } from '@/api/homeApi';
import { BarChart3 } from 'lucide-react';

/*
 * Reports — read-only analytics for BOTH segments.
 *   B2B: GST reporting from stored snapshots (late-fee, grid, trend, calendar…).
 *   B2C: home dashboard (net worth, cash flow, SIP, consent health) from AA data.
 * Backend: b2b/reports/index.ts (/b2b/reports) + b2c/homeRoutes.ts (/b2c/reports).
 */
export default function ReportsPage() {
  const [fy, setFy] = useState('2024-25');
  const [gstin, setGstin] = useState('');
  const [alertId, setAlertId] = useState('');
  const [months, setMonths] = useState('6');

  const gstParams = () => ({ fy: fy || undefined, gstin: gstin || undefined });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Reports"
        subtitle="Read-only analytics for both segments — B2B GST reporting from snapshots, and the B2C home dashboard from Account-Aggregator data."
        icon={<BarChart3 size={18} />}
        badge="B2C + B2B"
      />

      {/* Shared filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Financial Year (fy) — B2B" value={fy} onChange={setFy} placeholder="2024-25" />
          <Field label="GSTIN (optional) — B2B" value={gstin} onChange={setGstin} placeholder="all if blank" />
        </div>
      </div>

      {/* ---------- B2B ---------- */}
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">B2B · GST reporting</p>
      <div className="space-y-4 mb-8">
        <ApiCard
          title="Late-fee Exposure"
          method="GET"
          endpoint="/api/v1/b2b/reports/late-fee"
          description="Late-fee owed on overdue returns, per GSTIN and period."
          onSubmit={() => reportsApi.getLateFeeExposure(gstParams())}
        />
        <ApiCard
          title="Turnover Bands"
          method="GET"
          endpoint="/api/v1/b2b/reports/late-fee/turnover-bands"
          description="The turnover bands used to compute the per-day late fee."
          onSubmit={() => reportsApi.listTurnoverBands()}
        />
        <ApiCard
          title="Mark Return NIL"
          method="PATCH"
          endpoint="/api/v1/b2b/reports/late-fee/returns/:alertId/nil"
          description="Mark a late-fee return alert as NIL (nothing to file for that period)."
          onSubmit={() => reportsApi.markNil(alertId)}
        >
          <Field label="Alert ID" value={alertId} onChange={setAlertId} placeholder="late-fee alert id" fullWidth />
        </ApiCard>
        <ApiCard
          title="GSTIN Grid"
          method="GET"
          endpoint="/api/v1/b2b/reports/gstin-grid"
          description="GSTINs × periods matrix — filed / pending / overdue."
          onSubmit={() => reportsApi.getGstinGrid(gstParams())}
        />
        <ApiCard
          title="Sales Trend"
          method="GET"
          endpoint="/api/v1/b2b/reports/sales-trend"
          description="Monthly turnover trend for the financial year (from stored snapshots)."
          onSubmit={() => reportsApi.getSalesTrend(gstParams())}
        />
        <ApiCard
          title="Compliance Calendar"
          method="GET"
          endpoint="/api/v1/b2b/reports/compliance-calendar"
          description="What is due when, and what is already late."
          onSubmit={() => reportsApi.getComplianceCalendar(gstParams())}
        />
        <ApiCard
          title="Snapshot Coverage"
          method="GET"
          endpoint="/api/v1/b2b/reports/snapshot-coverage"
          description="How much stored history the trend has to work with."
          onSubmit={() => reportsApi.getSnapshotCoverage(gstParams())}
        />
      </div>

      {/* ---------- B2C ---------- */}
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">B2C · Home dashboard</p>
      <div className="space-y-4">
        <ApiCard
          title="Home (full payload)"
          method="GET"
          endpoint="/api/v1/b2c/reports"
          description="The B2C home summary — net worth, cash flow, SIP and consent health together."
          onSubmit={() => homeApi.getHome()}
        />
        <ApiCard
          title="Net Worth"
          method="GET"
          endpoint="/api/v1/b2c/reports/net-worth"
          description="Net-worth snapshot across all linked accounts."
          onSubmit={() => homeApi.getNetWorth()}
        />
        <ApiCard
          title="Cash Flow"
          method="GET"
          endpoint="/api/v1/b2c/reports/cash-flow"
          description="Inflow / outflow over the last N months."
          onSubmit={() => homeApi.getCashFlow(Number(months) || undefined)}
        >
          <Field label="Months" value={months} onChange={setMonths} placeholder="6" />
        </ApiCard>
        <ApiCard
          title="SIP Tracker"
          method="GET"
          endpoint="/api/v1/b2c/reports/sip"
          description="Systematic investment plans (mutual funds)."
          onSubmit={() => homeApi.getSip()}
        />
        <ApiCard
          title="Consent Health"
          method="GET"
          endpoint="/api/v1/b2c/reports/consents"
          description="Which linked consents are active / expiring."
          onSubmit={() => homeApi.getConsentHealth()}
        />
      </div>
    </div>
  );
}
