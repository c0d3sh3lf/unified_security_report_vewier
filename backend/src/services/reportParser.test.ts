import { describe, expect, it } from 'vitest';
import { parseReport } from './reportParser.js';
describe('report parser', () => {
  it('normalizes Trivy vulnerabilities and misconfigurations', () => {
    const parsed = parseReport({ ArtifactName: 'app:1', Results: [{ Target: 'package-lock.json', Vulnerabilities: [{ VulnerabilityID: 'CVE-1', PkgName: 'lib', Title: 'Issue', Severity: 'HIGH' }], Misconfigurations: [{ ID: 'DS001', Title: 'Config issue', Severity: 'LOW' }] }] });
    expect(parsed.tool).toBe('trivy'); expect(parsed.findings).toHaveLength(2); expect(parsed.findings[0].severity).toBe('high');
  });
  it('normalizes Semgrep findings', () => {
    const parsed = parseReport({ version: '1.0', results: [{ check_id: 'rule-id', path: 'src/app.ts', start: { line: 4 }, extra: { message: 'Unsafe call', severity: 'WARNING', metadata: { category: 'security' } } }] });
    expect(parsed.tool).toBe('semgrep'); expect(parsed.findings[0].location).toBe('src/app.ts:4'); expect(parsed.findings[0].severity).toBe('unknown');
  });
});
