import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AuthService } from '../services/authService.js';
export class AuthController extends BaseController {
  constructor(private readonly auth: AuthService) { super(); }
  login = async (req: Request, res: Response) => this.success(res, await this.auth.login(req.body.email, req.body.password));
  me = async (req: Request, res: Response) => this.success(res, req.user);
  updateProfile = async (req: Request, res: Response) => this.success(res, await this.auth.updateProfile(String(req.user!._id), req.body));
}
