import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config/config.js';
import { AuthService } from './services/authService.js';
import { UserRepository } from './repositories/UserRepository.js';

const start = async () => {
  await mongoose.connect(config.database.uri);
  await new AuthService(new UserRepository()).bootstrap();
  const server = createApp().listen(config.app.port, () => process.stdout.write(`Security Reports API listening on ${config.app.port}\n`));
  const shutdown = async () => { await new Promise<void>((resolve) => server.close(() => resolve())); await mongoose.disconnect(); process.exit(0); };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
};
start().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exit(1); });
