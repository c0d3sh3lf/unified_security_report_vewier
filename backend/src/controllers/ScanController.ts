import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ScanService } from '../services/scanService.js';
import { ApiKeyService } from '../services/apiKeyService.js';
export class ScanController extends BaseController {
  constructor(private readonly scans: ScanService, private readonly keys: ApiKeyService) { super(); }
  ingest = async (req: Request, res: Response) => this.success(res, await this.scans.ingest({ ownerId: String(req.user!._id), ...req.body, source: 'manual' }), 201);
  ingestApi = async (req: Request, res: Response) => {
    const ownerId = await this.keys.authenticate(req.header('x-api-key') ?? '');
    this.success(res, await this.scans.ingest({ ownerId, ...req.body, source: 'api' }), 201);
  };
  list = async (req: Request, res: Response) => this.success(res, await this.scans.list({ id: String(req.user!._id), role: req.user!.role }, typeof req.query.pipeline === 'string' ? req.query.pipeline : undefined));
  get = async (req: Request, res: Response) => this.success(res, await this.scans.get({ id: String(req.user!._id), role: req.user!.role }, String(req.params.id)));
  overview = async (req: Request, res: Response) => this.success(res, (await this.scans.overview({ id: String(req.user!._id), role: req.user!.role }))[0] ?? { scans: 0, critical: 0, high: 0, medium: 0, low: 0, totalFindings: 0 });
  pipelines = async (req: Request, res: Response) => this.success(res, await this.scans.pipelines({ id: String(req.user!._id), role: req.user!.role }));
}
