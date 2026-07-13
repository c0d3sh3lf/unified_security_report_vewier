import { AppError } from '../errors/AppError.js';
import { ScanRepository } from '../repositories/ScanRepository.js';
import { parseReport } from './reportParser.js';
import { summarizeFindings } from '../utils/findingSummary.js';

type IngestInput = { ownerId: string; pipeline: string; buildNumber?: string; branch?: string; commit?: string; buildUrl?: string; tool?: 'trivy' | 'semgrep'; report: unknown; source: 'api' | 'manual' };
export class ScanService {
  constructor(private readonly scans: ScanRepository) {}
  async ingest(input: IngestInput) {
    const parsed = parseReport(input.report, input.tool);
    if (!Number.isFinite(parsed.scannedAt.getTime())) throw new AppError(400, 'Report contains an invalid scan timestamp');
    return this.scans.create({ ownerId: input.ownerId, pipeline: input.pipeline, buildNumber: input.buildNumber ?? '', branch: input.branch ?? '', commit: input.commit ?? '', buildUrl: input.buildUrl ?? '', tool: parsed.tool, artifact: parsed.artifact, findings: parsed.findings, summary: summarizeFindings(parsed.findings), source: input.source, scannedAt: parsed.scannedAt });
  }
  list(requester: { id: string; role: string }, pipeline?: string) { return this.scans.list({ ...(requester.role === 'admin' ? {} : { ownerId: requester.id }), ...(pipeline ? { pipeline } : {}) }); }
  async get(requester: { id: string; role: string }, id: string) { const scan = await this.scans.findById(id); if (!scan || (requester.role !== 'admin' && String(scan.ownerId) !== requester.id)) throw new AppError(404, 'Scan not found'); return scan; }
  overview(requester: { id: string; role: string }) { return this.scans.overview(requester.role === 'admin' ? {} : { ownerId: requester.id }); }
  pipelines(requester: { id: string; role: string }) { return this.scans.pipelines(requester.role === 'admin' ? {} : { ownerId: requester.id }); }
}
