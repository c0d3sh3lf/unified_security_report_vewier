import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { AppError } from '../errors/AppError.js';
export const validate = (schema: z.ZodType): RequestHandler => (req, _res, next) => { const parsed = schema.safeParse(req.body); if (!parsed.success) return next(new AppError(400, 'Invalid request payload', parsed.error.flatten())); req.body = parsed.data; next(); };
