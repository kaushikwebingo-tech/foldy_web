import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { moneyoneApi, type AaTemplate } from '@/api/moneyoneApi';
import { Landmark } from 'lucide-react';

const TEMPLATES: { label: string; value: AaTemplate }[] = [
  { label: 'Banking (bank statements)', value: 'banking' },
  { label: 'Equity (shares / demat)', value: 'equity' },
  { label: 'Mutual Funds / SIP', value: 'mf-sip' },
];

export default function MoneyOnePage() {
  const [template, setTemplate] = useState<AaTemplate>('banking');
  const [pan, setPan] = useState('');
  const [handle, setHandle] = useState('');
  const [consentId, setConsentId] = useState('');
  const [linkRef, setLinkRef] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Investment — Account Aggregator (MoneyOne / OneMoney)"
        subtitle="Consent-based access to bank / demat / mutual-fund data via the FinPro AA. Create a consent → the user approves at OneMoney → resolve it → pull FI data."
        icon={<Landmark size={18} />}
        badge="B2C Only"
        postmanSection="moneyone"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Flow:</strong> Create Consent (returns webRedirectionUrl + token) → send the user
        to that URL to approve → OneMoney redirects to our public callback, which verifies the real
        status and deep-links back → Consent Status shows <em>active</em> → then Resolve / pull data.
      </div>

      <div className="space-y-4">
        <SelectField
          label="Product Template"
          value={template}
          onChange={(v) => setTemplate(v as AaTemplate)}
          options={TEMPLATES}
          fullWidth
        />

        {/* 0. Templates catalogue */}
        <ApiCard
          title="List Product Templates"
          method="GET"
          endpoint="/api/v1/b2c/moneyone/templates"
          description="The AA product templates this server exposes (banking / equity / mf-sip)."
          onSubmit={() => moneyoneApi.listTemplates()}
        />

        {/* 1. Create consent */}
        <ApiCard
          step={1}
          title="Create Consent"
          method="POST"
          endpoint={`/api/v1/b2c/moneyone/${template}/consent`}
          description="Persists a PENDING consent and returns { webRedirectionUrl, consentHandle, token }. PAN is optional — the server falls back to the user's PAN. Send the user to webRedirectionUrl to approve."
          onSubmit={async () => {
            const res = await moneyoneApi.createConsent(
              template,
              pan ? { pan } : {},
            );
            const h = res.data?.data?.consentHandle;
            if (h) setHandle(h);
            return res;
          }}
        >
          <Field
            label="PAN (optional)"
            value={pan}
            onChange={setPan}
            placeholder="Falls back to the user's PAN"
            fullWidth
          />
        </ApiCard>

        {/* 2. Consent status — low input */}
        <ApiCard
          step={2}
          title="Consent Status (am I linked?)"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/consent/status`}
          description="Latest persisted consent for this user + template: { linked, status, consentId }. Set by the callback after the user returns from OneMoney."
          onSubmit={() => moneyoneApi.consentStatus(template)}
        />

        {/* 3. Resolve consent */}
        <ApiCard
          step={3}
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
          <Field
            label="Consent Handle"
            value={handle}
            onChange={setHandle}
            placeholder="Auto-filled from Create Consent"
            fullWidth
          />
        </ApiCard>

        {/* 4. All FI data */}
        <ApiCard
          step={4}
          title="Get All FI Data"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/data/:consentId/all`}
          description="All financial data available under a granted consent."
          onSubmit={() => moneyoneApi.getAllData(template, consentId)}
        >
          <Field
            label="Consent ID"
            value={consentId}
            onChange={setConsentId}
            placeholder="Auto-filled from Resolve"
            fullWidth
          />
        </ApiCard>

        {/* 5. Single account */}
        <ApiCard
          step={5}
          title="Get Account Data"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/data/:consentId/account/:linkRef`}
          description="FI data for a single linked account (by its link reference number)."
          onSubmit={() => moneyoneApi.getAccountData(template, consentId, linkRef)}
        >
          <Field label="Consent ID" value={consentId} onChange={setConsentId} placeholder="From Resolve" />
          <Field label="Link Reference No." value={linkRef} onChange={setLinkRef} placeholder="linkRefNumber" />
        </ApiCard>

        {/* 6. Account balance */}
        <ApiCard
          step={6}
          title="Get Account Balance"
          method="GET"
          endpoint={`/api/v1/b2c/moneyone/${template}/data/:consentId/account/:linkRef/balance`}
          description="Current balance for a single linked account."
          onSubmit={() => moneyoneApi.getAccountBalance(template, consentId, linkRef)}
        >
          <Field label="Consent ID" value={consentId} onChange={setConsentId} placeholder="From Resolve" />
          <Field label="Link Reference No." value={linkRef} onChange={setLinkRef} placeholder="linkRefNumber" />
        </ApiCard>
      </div>
    </div>
  );
}
