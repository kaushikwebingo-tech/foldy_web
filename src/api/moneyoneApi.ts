import { client } from './client';

// MoneyOne / OneMoney Account Aggregator — B2C (individual) only.
//
// Flow: createConsent → user approves at the AA (webRedirectionUrl) →
// resolveConsent(handle) → consentId → fetch data.
export type AaTemplate = 'mf-sip' | 'equity' | 'banking';

export const moneyoneApi = {
  // Product templates the server exposes.
  listTemplates: () =>
    client.get('/b2c/moneyone/templates'),

  // Start a consent request. pan/fipID/redirectUrl are optional — the server
  // falls back to the user's PAN and configured defaults.
  createConsent: (
    template: AaTemplate,
    payload: { pan?: string; fipID?: string[]; redirectUrl?: string } = {},
  ) => client.post(`/b2c/moneyone/${template}/consent`, payload),

  // Exchange the consentHandle returned by createConsent for a consentId.
  resolveConsent: (template: AaTemplate, handle: string) =>
    client.get(`/b2c/moneyone/${template}/consent/resolve`, { params: { handle } }),

  // "Am I linked?" — latest persisted consent for this user + template.
  // { linked, status, consentId, updatedAt }. Populated by the server callback
  // after the user returns from OneMoney.
  consentStatus: (template: AaTemplate) =>
    client.get(`/b2c/moneyone/${template}/consent/status`),

  // All financial data available under a granted consent.
  getAllData: (template: AaTemplate, consentId: string) =>
    client.get(`/b2c/moneyone/${template}/data/${consentId}/all`),

  // A single linked account.
  getAccountData: (template: AaTemplate, consentId: string, linkRef: string) =>
    client.get(`/b2c/moneyone/${template}/data/${consentId}/account/${linkRef}`),

  getAccountBalance: (template: AaTemplate, consentId: string, linkRef: string) =>
    client.get(`/b2c/moneyone/${template}/data/${consentId}/account/${linkRef}/balance`),
};
