import { describe, expect, it } from 'vitest';
import { filterReports, severityCounts } from './App';
import type { Scan } from './api';

const report = (overrides: Partial<Scan>): Scan => ({ _id: 'report-id', pipeline: 'payments-api', buildNumber: '42', branch: 'main', commit: 'abc123', buildUrl: '', tool: 'trivy', artifact: 'registry/payments:42', findings: [], summary: { critical: 0, high: 1, medium: 0, low: 0, total: 1 }, source: 'api', scannedAt: '2026-07-13T10:00:00.000Z', ownerId: 'owner-id', ...overrides });

describe('report inventory filtering', () => {
  const reports = [report({}), report({ _id: 'semgrep-id', pipeline: 'web-ui', tool: 'semgrep', branch: 'release/7.4', artifact: '' })];
  it('matches report identity and pipeline metadata without case sensitivity', () => {
    expect(filterReports(reports, 'PAYMENTS')).toHaveLength(1);
    expect(filterReports(reports, 'release/7.4')).toEqual([reports[1]]);
    expect(filterReports(reports, 'semgrep')).toEqual([reports[1]]);
  });
  it('keeps every report for an empty query and returns none for an unknown query', () => {
    expect(filterReports(reports, '   ')).toHaveLength(2);
    expect(filterReports(reports, 'unknown-pipeline')).toHaveLength(0);
  });
  it('includes modern low and medium severity counts for list rendering', () => {
    expect(severityCounts({ critical: 0, high: 1, medium: 2, low: 3, total: 6 })).toEqual([['high', 1], ['medium', 2], ['low', 3]]);
  });
});
