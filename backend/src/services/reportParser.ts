import { AppError } from '../errors/AppError.js';

export type Finding = { identifier: string; title: string; severity: string; category: string; target: string; location: string; description: string; reference: string; metadata: Record<string, unknown> };
export type ParsedReport = { tool: 'trivy' | 'semgrep'; artifact: string; findings: Finding[]; scannedAt: Date };
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value : value == null ? '' : String(value);
const severity = (value: unknown) => { const normalized = text(value).toLowerCase(); return ['critical', 'high', 'medium', 'low', 'info'].includes(normalized) ? normalized : 'unknown'; };
const semgrepSeverity = (value: unknown) => ({ info: 'low', warning: 'medium', error: 'high' }[text(value).toLowerCase()] ?? severity(value));

export const detectTool = (payload: unknown): 'trivy' | 'semgrep' => {
  const root = record(payload);
  const isTrivy = Array.isArray(root.Results) && (typeof root.SchemaVersion === 'number' || typeof root.ArtifactName === 'string' || Object.keys(record(root.Trivy)).length > 0);
  const isSemgrep = Array.isArray(root.results) && typeof root.version === 'string';
  if (isTrivy) return 'trivy';
  if (isSemgrep) return 'semgrep';
  throw new AppError(400, 'Unsupported report format. Upload a Trivy JSON or Semgrep JSON report.');
};
export const parseReport = (payload: unknown, requestedTool?: 'trivy' | 'semgrep'): ParsedReport => {
  const detectedTool = detectTool(payload);
  if (requestedTool && requestedTool !== detectedTool) throw new AppError(400, `Selected scanner "${requestedTool}" does not match the uploaded ${detectedTool} report.`);
  const tool = requestedTool ?? detectedTool;
  const root = record(payload);
  if (tool === 'trivy') {
    const results = Array.isArray(root.Results) ? root.Results : [];
    const findings = results.flatMap((result) => {
      const group = record(result); const target = text(group.Target);
      const vulnerabilities = Array.isArray(group.Vulnerabilities) ? group.Vulnerabilities : [];
      const misconfigurations = Array.isArray(group.Misconfigurations) ? group.Misconfigurations : [];
      return [...vulnerabilities, ...misconfigurations].map((item) => {
        const finding = record(item); const primary = text(finding.VulnerabilityID || finding.ID || finding.AVDID);
        return { identifier: primary || 'trivy-finding', title: text(finding.Title || finding.PkgName || primary), severity: severity(finding.Severity), category: vulnerabilities.includes(item) ? 'vulnerability' : 'misconfiguration', target, location: text(finding.PkgName || finding.CauseMetadata && record(finding.CauseMetadata).StartLine), description: text(finding.Description || finding.Message), reference: text(finding.PrimaryURL || finding.References && (finding.References as unknown[])[0]), metadata: finding };
      });
    });
    return { tool, artifact: text(root.ArtifactName), findings, scannedAt: new Date(text(root.CreatedAt) || Date.now()) };
  }
  const entries = Array.isArray(root.results) ? root.results : [];
  const findings = entries.map((entry) => {
    const item = record(entry); const extra = record(item.extra); const start = record(item.start); const metadata = record(extra.metadata);
    return { identifier: text(item.check_id) || 'semgrep-finding', title: text(extra.message) || text(item.check_id), severity: semgrepSeverity(extra.severity), category: text(metadata.category) || 'security', target: text(item.path), location: `${text(item.path)}:${text(start.line) || '1'}`, description: text(extra.message), reference: text(metadata.source || (metadata.references as unknown[] | undefined)?.[0]), metadata: item };
  });
  return { tool, artifact: '', findings, scannedAt: new Date() };
};
