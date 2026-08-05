import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { moneyoneApi, type AaTemplate } from '@/api/moneyoneApi';
import { bankApi } from '@/api/bankApi';
import { Landmark } from 'lucide-react';

const TEMPLATES: { label: string; value: AaTemplate }[] = [
  { label: 'Banking (bank statements)', value: 'banking' },
  { label: 'Equity (shares / demat)', value: 'equity' },
  { label: 'Mutual Funds / SIP', value: 'mf-sip' },
  { label: 'Insurance Policies', value: 'insurance_policies' },
];

function Divider({ label, note }: { label: string; note?: string }) {
  return (
    <div className="pt-6 pb-1">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      {note && <div className="text-xs text-slate-400 mt-0.5">{note}</div>}
    </div>
  );
}

export default function MoneyOnePage() {
  const [template, setTemplate] = useState<AaTemplate>('banking');
  const [pan, setPan] = useState('');
  const [handle, setHandle] = useState('');
  const [consentId, setConsentId] = useState('');
  const [linkRef, setLinkRef] = useState('');

  // Transaction list / filter inputs
  const [page, setPage] = useState('1');
  const [limit, setLimit] = useState('20');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [direction, setDirection] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [search, setSearch] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

  const txnQuery = () => ({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    from: from || undefined,
    to: to || undefined,
    direction: direction || undefined,
    minAmount: minAmount ? Number(minAmount) : undefined,
    maxAmount: maxAmount ? Number(maxAmount) : undefined,
    search: search || undefined,
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Investment — Account Aggregator (MoneyOne / OneMoney)"
        subtitle="Store-and-sync: FinPro data is ingested into our DB by jobs; the app reads the DB. FinPro is only called by ingest / sync / manual refresh."
        icon={<Landmark size={18} />}
        badge="B2C Only"
        postmanSection="moneyone"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Create Consent → user approves at OneMoney → callback verifies + deep-links
        back → status <em>active</em>. Data-ready webhook (or <strong>Sync Now</strong>) ingests into our
        DB. The app then reads <strong>Accounts / Detail / Transactions</strong> from the DB (fast, paged,
        filtered). Daily 02:00 IST cron keeps STORE+PERIODIC consents fresh.
      </div>

      <div className="space-y-4">
        <SelectField
          label="Product Template"
          value={template}
          onChange={(v) => setTemplate(v as AaTemplate)}
          options={TEMPLATES}
          fullWidth
        />

        <ApiCard
          title="List Product Templates"
          method="GET"
          endpoint="/api/v1/b2c/moneyone/templates"
          description="The AA product templates this server exposes (banking / equity / mf-sip)."
          onSubmit={() => moneyoneApi.listTemplates()}
        />

        {/* ---------- Consent ---------- */}
        <Divider label="Consent" />

        <ApiCard
          step={1}
          title="Create Consent"
          method="POST"
          endpoint={`/api/v1/b2c/moneyone/${template}/consent`}
          description="Persists a PENDING consent and returns { webRedirectionUrl, consentHandle, token }. PAN optional. Send the user to webRedirectionUrl to approve."
          onSubmit={async () => {
            const res = await moneyoneApi.createConsent(template, pan ? { pan } : {});
            const h = res.data?.data?.consentHandle;
            if (h) setHandle(h);
            return res;
          }}
        >
          <Field label="PAN (optional)" value={pan} onChange={setPan} placeholder="Falls back to the user's PAN" fullWidth />
        </ApiCard>

        <ApiCard
          step={2}
          title="Consent Status (am I linked?)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/consent/status`}
          description="Latest persisted consent: { linked, status, consentId }. Set by the callback."
          onSubmit={async () => {
            const res = await moneyoneApi.consentStatus(template);
            const cid = res.data?.data?.consentId;
            if (cid) setConsentId(cid);
            return res;
          }}
        />

        <ApiCard
          title="Revoke Consent"
          method="POST"
          endpoint={`/api/v1/b2c/moneyone/${template}/consent/revoke`}
          description="Withdraws at OneMoney, marks the record revoked, and PURGES the stored accounts + transactions (data-life). consentId optional."
          onSubmit={() => moneyoneApi.revokeConsent(template, consentId || undefined)}
        >
          <Field label="Consent ID (optional)" value={consentId} onChange={setConsentId} placeholder="Falls back to latest" fullWidth />
        </ApiCard>

        {/* ---------- Store-and-sync (app path) ---------- */}
        <Divider label="Store-and-sync — app path (DB-backed)" note="These serve the app. No live FinPro call." />

        <ApiCard
          title="Sync Now (manual refresh)"
          method="POST"
          endpoint={`/api/v1/b2c/moneyone/${template}/sync`}
          description="Forces a full re-ingest of the latest consent's data (getallfidata → normalize → upsert). Returns { accounts, transactions, errors }. Use this if the data-ready webhook hasn't fired."
          onSubmit={() => moneyoneApi.sync(template, consentId || undefined)}
        >
          <Field label="Consent ID (optional)" value={consentId} onChange={setConsentId} placeholder="Falls back to latest" fullWidth />
        </ApiCard>

        <ApiCard
          title="Accounts (bank-list screen)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/accounts`}
          description="Stored, normalized accounts from our DB → { accounts: [{ linkRefNumber, maskedAccountNumber, bank, fiType, category, headlineLabel, headlineValue, … }] }. Empty until ingest has run."
          onSubmit={async () => {
            const res = await moneyoneApi.accounts(template);
            const first = res.data?.data?.accounts?.[0]?.linkRefNumber;
            if (first && !linkRef) setLinkRef(first);
            return res;
          }}
        />

        <ApiCard
          title="Account Detail (profile + summary)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/accounts/:linkRef`}
          description="Detail header from DB → account + { profile (decrypted, PAN masked), summaryFields, holdings }."
          onSubmit={() => moneyoneApi.accountDetail(template, linkRef)}
        >
          <Field label="Link Reference No." value={linkRef} onChange={setLinkRef} placeholder="Auto-filled from Accounts" fullWidth />
        </ApiCard>

        <ApiCard
          title="Transactions (paged + filtered)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/accounts/:linkRef/transactions`}
          description="Lazy-loaded, newest first → { items, page, limit, total, hasMore }. Filters combine with AND."
          onSubmit={() => moneyoneApi.transactions(template, linkRef, txnQuery())}
        >
          <Field label="Link Reference No." value={linkRef} onChange={setLinkRef} placeholder="linkRefNumber" fullWidth />
          <Field label="Page" value={page} onChange={setPage} placeholder="1" />
          <Field label="Limit" value={limit} onChange={setLimit} placeholder="20 (max 100)" />
          <Field label="From (ISO date)" value={from} onChange={setFrom} placeholder="2025-01-01" />
          <Field label="To (ISO date)" value={to} onChange={setTo} placeholder="2025-12-31" />
          <Field label="Direction (CSV)" value={direction} onChange={setDirection} placeholder="credit,debit,buy,sell" />
          <Field label="Min amount" value={minAmount} onChange={setMinAmount} placeholder="0" />
          <Field label="Max amount" value={maxAmount} onChange={setMaxAmount} placeholder="100000" />
          <Field label="Search (description)" value={search} onChange={setSearch} placeholder="salary" fullWidth />
        </ApiCard>

        <ApiCard
          title="Transactions Export (PDF / CSV statement)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/accounts/:linkRef/transactions/export`}
          description="Downloads the formatted statement — PDF by default (product-aware: bank ledger vs investment ledger), or format=csv for the raw CSV grid. Same filters as the transactions list; no pagination. Returns a binary file (blob)."
          onSubmit={() => moneyoneApi.exportTransactions(template, linkRef, {
            format: exportFormat,
            from: from || undefined,
            to: to || undefined,
            direction: direction || undefined,
            minAmount: minAmount ? Number(minAmount) : undefined,
            maxAmount: maxAmount ? Number(maxAmount) : undefined,
            search: search || undefined,
          })}
        >
          <Field label="Link Reference No." value={linkRef} onChange={setLinkRef} placeholder="linkRefNumber" fullWidth />
          <SelectField
            label="Format"
            value={exportFormat}
            onChange={(v) => setExportFormat(v as 'pdf' | 'csv')}
            options={[{ label: 'PDF statement', value: 'pdf' }, { label: 'CSV grid', value: 'csv' }]}
          />
        </ApiCard>

        <ApiCard
          title="Transactions Email"
          method="POST"
          endpoint={`/api/v1/b2c/moneyone/${template}/accounts/:linkRef/transactions/email`}
          description="Emails the formatted PDF statement to the user's OWN registered email. Same filter query params. Returns { to, count }."
          onSubmit={() => moneyoneApi.emailTransactions(template, linkRef, txnQuery())}
        >
          <Field label="Link Reference No." value={linkRef} onChange={setLinkRef} placeholder="linkRefNumber" fullWidth />
        </ApiCard>

        {/* ---------- Utilities ---------- */}
        <Divider label="Utilities" note="Shared helpers (used across the app)." />

        <ApiCard
          title="Bank Info (logos + names)"
          method="GET"
          endpoint="/api/v1/bank-info"
          description="Returns the bank-logo mapping the app renders in the bank list → [{ ifscCode, bankName, iconUrl (signed, 24h) }]. No params."
          onSubmit={() => bankApi.getBankInfo()}
        />

        {/* ---------- Legacy live FinPro reads ---------- */}
        <Divider label="Legacy — live FinPro reads" note="Kept for debugging. Not the app path." />

        <ApiCard
          title="Resolve Consent (handle → consentId)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/consent/resolve`}
          description="Exchanges the consentHandle for { consentID, status, accounts } (verified against OneMoney)."
          onSubmit={async () => {
            const res = await moneyoneApi.resolveConsent(template, handle);
            const cid = res.data?.data?.consentID;
            if (cid) setConsentId(cid);
            return res;
          }}
        >
          <Field label="Consent Handle" value={handle} onChange={setHandle} placeholder="From Create Consent" fullWidth />
        </ApiCard>

        <ApiCard
          title="Get All FI Data (live)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/data/:consentId/all`}
          description="All financial data live from FinPro under a granted consent (heavy)."
          onSubmit={() => moneyoneApi.getAllData(template, consentId)}
        >
          <Field label="Consent ID" value={consentId} onChange={setConsentId} placeholder="From Resolve" fullWidth />
        </ApiCard>

        <ApiCard
          title="Get Account Data (live)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/data/:consentId/account/:linkRef`}
          description="Live FI data for a single linked account."
          onSubmit={() => moneyoneApi.getAccountData(template, consentId, linkRef)}
        >
          <Field label="Consent ID" value={consentId} onChange={setConsentId} placeholder="From Resolve" />
          <Field label="Link Reference No." value={linkRef} onChange={setLinkRef} placeholder="linkRefNumber" />
        </ApiCard>

        <ApiCard
          title="Get Account Balance (live)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/data/:consentId/account/:linkRef/balance`}
          description="Live balance for a single linked account."
          onSubmit={() => moneyoneApi.getAccountBalance(template, consentId, linkRef)}
        >
          <Field label="Consent ID" value={consentId} onChange={setConsentId} placeholder="From Resolve" />
          <Field label="Link Reference No." value={linkRef} onChange={setLinkRef} placeholder="linkRefNumber" />
        </ApiCard>
      </div>
    </div>
  );
}
