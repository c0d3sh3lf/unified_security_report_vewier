import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ApiKeyService } from '../services/apiKeyService.js';
export class ApiKeyController extends BaseController {
  constructor(private readonly keys: ApiKeyService) { super(); }
  list = async (req: Request, res: Response) => this.success(res, await this.keys.list(String(req.user!._id)));
  create = async (req: Request, res: Response) => this.success(res, await this.keys.create(String(req.user!._id), req.body.label, req.body.expiresAt ? new Date(req.body.expiresAt) : null), 201);
  revoke = async (req: Request, res: Response) => { await this.keys.revoke(String(req.params.id), req.user!.role === 'admin' ? undefined : String(req.user!._id)); this.noContent(res); };
}
