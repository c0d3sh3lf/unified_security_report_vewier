import { z } from 'zod';

const environmentSchema = z.object({
  MONGO_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  DEFAULT_ADMIN_NAME: z.string().min(2).max(80).default('Platform Administrator'),
  DEFAULT_ADMIN_EMAIL: z.string().email().default('admin@security.local'),
  DEFAULT_ADMIN_PASSWORD: z.string().min(12).default('ChangeMe123!'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((x) => x.message).join(', ')}`);

export const config = {
  database: { uri: parsed.data.MONGO_URI },
  auth: { jwtSecret: parsed.data.JWT_SECRET, jwtExpiresIn: parsed.data.JWT_EXPIRES_IN },
  app: { port: parsed.data.API_PORT, corsOrigin: parsed.data.CORS_ORIGIN, environment: parsed.data.NODE_ENV },
  bootstrap: { name: parsed.data.DEFAULT_ADMIN_NAME, email: parsed.data.DEFAULT_ADMIN_EMAIL, password: parsed.data.DEFAULT_ADMIN_PASSWORD }
} as const;
