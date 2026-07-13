import { describe, expect, it } from 'vitest';
import { parseReport } from './reportParser.js';
describe('report parser', () => {
  it('normalizes Trivy vulnerabilities and misconfigurations', () => {
    const parsed = parseReport({ ArtifactName: 'app:1', Results: [{ Target: 'package-lock.json', Vulnerabilities: [{ VulnerabilityID: 'CVE-1', PkgName: 'lib', Title: 'Issue', Severity: 'HIGH' }], Misconfigurations: [{ ID: 'DS001', Title: 'Config issue', Severity: 'LOW' }] }] });
    expect(parsed.tool).toBe('trivy'); expect(parsed.findings).toHaveLength(2); expect(parsed.findings[0].severity).toBe('high');
  });
  it('maps legacy Semgrep OSS severities to modern severity levels', () => {
    const parsed = parseReport({ version: '1.0', results: [
      { check_id: 'info-rule', path: 'src/info.ts', start: { line: 1 }, extra: { message: 'Info finding', severity: 'INFO', metadata: { category: 'security' } } },
      { check_id: 'warning-rule', path: 'src/warning.ts', start: { line: 2 }, extra: { message: 'Warning finding', severity: 'WARNING', metadata: { category: 'security' } } },
      { check_id: 'error-rule', path: 'src/error.ts', start: { line: 3 }, extra: { message: 'Error finding', severity: 'ERROR', metadata: { category: 'security' } } }
    ] });
    expect(parsed.tool).toBe('semgrep'); expect(parsed.findings.map((finding) => finding.severity)).toEqual(['low', 'medium', 'high']); expect(parsed.findings[1].location).toBe('src/warning.ts:2');
  });
  it('rejects a report when the selected scanner type does not match its structure', () => {
    const semgrepReport = { version: '1.0', results: [] };
    expect(() => parseReport(semgrepReport, 'trivy')).toThrow('Selected scanner "trivy" does not match the uploaded semgrep report.');
  });
  it('rejects arbitrary JSON that is not a supported scan report', () => {
    expect(() => parseReport({ source: 'untrusted', findings: [] })).toThrow('Unsupported report format');
  });
});
