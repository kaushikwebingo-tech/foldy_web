import { client } from './client';

/*
 * B2B reports API — read-only GST reporting built from stored snapshots.
 * Backend: server/src/routes/app/v1/b2b/reports/index.ts (mounted at /api/v1/b2b/reports).
 * All guarded by requireB2B + requireModule('gst'). Snapshots are captured as a
 * side effect of viewing GST summaries, so there are no write endpoints here
 * except marking a late-fee return as NIL.
 */
export const reportsApi = {
  // Late-fee exposure for overdue returns.
  getLateFeeExposure: (params?: Record<string, unknown>) =>
    client.get('/b2b/reports/late-fee', { params }),

  // Turnover bands used to compute per-day late fee.
  listTurnoverBands: () =>
    client.get('/b2b/reports/late-fee/turnover-bands'),

  // Mark a late-fee return alert as NIL (nothing to file).
  markNil: (alertId: string) =>
    client.patch(`/b2b/reports/late-fee/returns/${alertId}/nil`),

  // GSTINs × periods matrix: filed / pending / overdue.
  getGstinGrid: (params?: Record<string, unknown>) =>
    client.get('/b2b/reports/gstin-grid', { params }),

  // Monthly turnover trend for a financial year (from snapshots).
  getSalesTrend: (params?: { financialYear?: string; gstin?: string }) =>
    client.get('/b2b/reports/sales-trend', { params }),

  // What is due when, and what is already late.
  getComplianceCalendar: (params?: Record<string, unknown>) =>
    client.get('/b2b/reports/compliance-calendar', { params }),

  // How much stored history the trend has to work with.
  getSnapshotCoverage: (params?: Record<string, unknown>) =>
    client.get('/b2b/reports/snapshot-coverage', { params }),
};
