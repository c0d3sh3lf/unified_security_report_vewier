import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from './config/config.js';
import { router } from './routes/routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.app.corsOrigin, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Authorization', 'Content-Type', 'X-API-Key'] }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
  if (config.app.environment !== 'test') app.use(morgan('combined'));
  app.use(express.json({ limit: '15mb' }));
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', router);
  app.use(notFound); app.use(errorHandler);
  return app;
};
