import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import { config } from '../config/config.js';
export const notFound: RequestHandler = (_req, _res, next) => next(new AppError(404, 'Route not found'));
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) return res.status(error.statusCode).json({ error: { message: error.message, details: error.details } });
  if (error?.name === 'CastError') return res.status(400).json({ error: { message: 'Malformed resource identifier' } });
  if (error?.code === 11000) return res.status(409).json({ error: { message: 'A unique field already has that value' } });
  if (config.app.environment !== 'test') process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  return res.status(500).json({ error: { message: 'An unexpected server error occurred' } });
};
