import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URL: z.string().url().default('mongodb://localhost:27017'),
  MONGODB_DATABASE: z.string().default('retroboard'),
  COOKIE_SECRET: z.string().min(16).default('dev-cookie-secret-16chars'),
  ADMIN_SECRET_KEY: z.string().min(16).default('dev-admin-secret-16chars'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  APP_URL: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

export const env = loadEnv();
