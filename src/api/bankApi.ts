import { client } from './client';

/*
 * Bank info — GET /api/v1/bank-info
 * Returns the bank-logo mapping the app uses to render bank names + icons
 * (e.g. in the MoneyOne bank list). No params; the server returns every bank
 * that has a logo, each as { ifscCode, bankName, iconUrl (signed, 24h) }.
 */
export const bankApi = {
  getBankInfo: () => client.get('/bank-info'),
};
