import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  MONGO_MAX_POOL_SIZE: z.coerce.number().int().min(1).default(20),
  MONGO_MIN_POOL_SIZE: z.coerce.number().int().min(0).default(2),
  REDIS_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  QR_TOKEN_SECRET: z.string().min(1, 'QR_TOKEN_SECRET is required'),
  // Opt-in bypass for the whole auth system — see auth.middleware.ts. Off by
  // default; only set to true deliberately.
  AUTH_DISABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  FACE_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.3),
  QR_DEFAULT_VALID_MINUTES: z.coerce.number().default(5),

  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables — see errors above.');
  }

  return parsed.data;
}

export const env = loadEnv();
export const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
