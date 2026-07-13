import mongoose from 'mongoose';
import { config } from './config/config.js';
import { ScanRepository } from './repositories/ScanRepository.js';
import { migrateLegacySemgrepSeverities } from './services/semgrepSeverityMigration.js';

const run = async () => {
  await mongoose.connect(config.database.uri);
  const updated = await migrateLegacySemgrepSeverities(new ScanRepository());
  process.stdout.write(`Updated ${updated} persisted Semgrep report severity summaries\n`);
  await mongoose.disconnect();
};
run().catch(async (error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); await mongoose.disconnect(); process.exit(1); });
