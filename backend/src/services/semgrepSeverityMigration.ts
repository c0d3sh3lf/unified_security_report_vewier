import type { Finding } from './reportParser.js';
import { ScanRepository } from '../repositories/ScanRepository.js';
import { summarizeFindings } from '../utils/findingSummary.js';

const legacySeverityMap: Record<string, 'low' | 'medium' | 'high'> = { INFO: 'low', WARNING: 'medium', ERROR: 'high' };
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const legacySeverity = (finding: Finding) => {
  const rawSeverity = record(record(finding.metadata).extra).severity;
  return legacySeverityMap[String(rawSeverity).toUpperCase()];
};

/** Converts persisted Semgrep OSS severity labels and rebuilds document summaries. Safe to run repeatedly. */
export const migrateLegacySemgrepSeverities = async (scans: ScanRepository) => {
  let reportsUpdated = 0;
  for (const scan of await scans.findSemgrepScans()) {
    const originalFindings = scan.findings as Finding[];
    let changed = false;
    const findings = originalFindings.map((finding) => {
      const mappedSeverity = legacySeverity(finding) ?? (finding.severity === 'info' ? 'low' : undefined);
      if (!mappedSeverity || finding.severity === mappedSeverity) return finding;
      changed = true;
      return { ...finding, severity: mappedSeverity };
    });
    if (changed) { await scans.replaceFindingsAndSummary(String(scan._id), findings, summarizeFindings(findings)); reportsUpdated += 1; }
  }
  return reportsUpdated;
};
