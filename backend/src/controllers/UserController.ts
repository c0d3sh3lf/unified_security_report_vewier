import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { UserService } from '../services/userService.js';
export class UserController extends BaseController {
  constructor(private readonly users: UserService) { super(); }
  list = async (_req: Request, res: Response) => this.success(res, await this.users.list());
  create = async (req: Request, res: Response) => this.success(res, await this.users.create(req.body), 201);
}
