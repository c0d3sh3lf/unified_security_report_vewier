import type { Finding } from '../services/reportParser.js';

export type FindingSummary = { critical: number; high: number; medium: number; low: number; info: number; unknown: number; total: number };
export const summarizeFindings = (findings: Finding[]): FindingSummary => findings.reduce((summary, finding) => { summary[finding.severity as keyof FindingSummary] += 1; summary.total += 1; return summary; }, { critical: 0, high: 0, medium: 0, low: 0, info: 0, unknown: 0, total: 0 });
