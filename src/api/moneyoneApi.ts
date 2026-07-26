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

  // Withdraw a linked account. consentId optional — server falls back to the
  // user's latest consent. Revokes at OneMoney, then marks the record revoked.
  revokeConsent: (template: AaTemplate, consentId?: string) =>
    client.post(`/b2c/moneyone/${template}/consent/revoke`, consentId ? { consentId } : {}),

  // --- Store-and-sync DB reads (app path). FinPro is only hit by the jobs. ---

  // Stored account list for the bank-list screen.
  accounts: (template: AaTemplate) =>
    client.get(`/b2c/moneyone/${template}/accounts`),

  // Account detail header — profile + summary + holdings.
  accountDetail: (template: AaTemplate, linkRef: string) =>
    client.get(`/b2c/moneyone/${template}/accounts/${linkRef}`),

  // Paginated + filtered transactions (lazy loading).
  transactions: (
    template: AaTemplate,
    linkRef: string,
    query: {
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
      direction?: string;
      minAmount?: number;
      maxAmount?: number;
      search?: string;
    } = {},
  ) => client.get(`/b2c/moneyone/${template}/accounts/${linkRef}/transactions`, { params: query }),

  // Email the filtered CSV statement to the user's own address.
  emailTransactions: (template: AaTemplate, linkRef: string, query: Record<string, unknown> = {}) =>
    client.post(`/b2c/moneyone/${template}/accounts/${linkRef}/transactions/email`, {}, { params: query }),

  // Manual "refresh now" — re-ingests the latest consent's data.
  sync: (template: AaTemplate, consentId?: string) =>
    client.post(`/b2c/moneyone/${template}/sync`, consentId ? { consentId } : {}),

  // Slim account list for the bank-list screen — { accounts, consentId }, no
  // transactions. consentId resolves from the latest consent (or pass ?consentId).
  listAccounts: (template: AaTemplate, consentId?: string) =>
    client.get(`/b2c/moneyone/${template}/accounts`, {
      params: consentId ? { consentId } : undefined,
    }),

  // All financial data available under a granted consent.
  getAllData: (template: AaTemplate, consentId: string) =>
    client.get(`/b2c/moneyone/${template}/data/${consentId}/all`),

  // A single linked account's transactions. Optional limit/offset page the
  // transactions (FinPro /getfidata pagination) — omit both to fetch all.
  getAccountData: (
    template: AaTemplate,
    consentId: string,
    linkRef: string,
    page?: { limit?: number; offset?: number },
  ) =>
    client.get(`/b2c/moneyone/${template}/data/${consentId}/account/${linkRef}`, {
      params: page,
    }),

  getAccountBalance: (template: AaTemplate, consentId: string, linkRef: string) =>
    client.get(`/b2c/moneyone/${template}/data/${consentId}/account/${linkRef}/balance`),
};
