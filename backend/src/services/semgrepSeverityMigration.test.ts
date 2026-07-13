import { describe, expect, it } from 'vitest';
import { migrateLegacySemgrepSeverities } from './semgrepSeverityMigration.js';
import type { ScanRepository } from '../repositories/ScanRepository.js';

describe('legacy Semgrep severity migration', () => {
  it('updates persisted legacy findings and rebuilds their report summary', async () => {
    const updates: Array<{ id: string; findings: Array<{ severity: string }>; summary: { low: number; medium: number; high: number; total: number } }> = [];
    const repository = {
      findSemgrepScans: async () => [{ _id: 'report-1', findings: [
        { identifier: 'info', severity: 'info', metadata: { extra: { severity: 'INFO' } } },
        { identifier: 'warning', severity: 'unknown', metadata: { extra: { severity: 'WARNING' } } },
        { identifier: 'error', severity: 'unknown', metadata: { extra: { severity: 'ERROR' } } }
      ] }],
      replaceFindingsAndSummary: async (id: string, findings: Array<{ severity: string }>, summary: { low: number; medium: number; high: number; total: number }) => { updates.push({ id, findings, summary }); }
    } as unknown as ScanRepository;
    await expect(migrateLegacySemgrepSeverities(repository)).resolves.toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].findings.map((finding) => finding.severity)).toEqual(['low', 'medium', 'high']);
    expect(updates[0].summary).toMatchObject({ low: 1, medium: 1, high: 1, total: 3 });
  });
});
