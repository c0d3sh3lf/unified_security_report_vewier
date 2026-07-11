import type { Response } from 'express';
export class BaseController {
  protected success(response: Response, data: unknown, status = 200) { response.status(status).json({ data }); }
  protected noContent(response: Response) { response.status(204).send(); }
}
