import { existsSync } from 'node:fs';
import { z } from 'astro/zod';

// Local convenience: load `.env` without overriding variables already set by the
// process manager (systemd EnvironmentFile, CI, tests).
if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* unreadable .env is treated as absent */
  }
}

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const int = (fallback: number) =>
  z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((v) => v ?? fallback);

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.url().optional(),
  PUBLIC_SITE_URL: z.url().default('http://localhost:4321'),
  BUSINESS_WHATSAPP_NUMBER: z
    .string()
    .optional()
    .transform((v) => (v ?? '').replace(/\D/g, ''))
    .refine((v) => v === '' || (v.length >= 8 && v.length <= 15), {
      message: 'BUSINESS_WHATSAPP_NUMBER must be country code + 8–15 digits, or empty',
    }),
  SESSION_SECRET: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  TRUST_PROXY: bool,
  RATE_LIMIT_LOGIN_MAX: int(5),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: int(900),
  RATE_LIMIT_EVENTS_MAX: int(60),
  RATE_LIMIT_EVENTS_WINDOW_SECONDS: int(60),
  ROUTE_PAGE_CACHE_SECONDS: int(300),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Validated environment. Throws a readable error on misconfiguration. */
export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === 'production';

export function requireDatabaseUrl(): string {
  const url = env().DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env and configure it.');
  return url;
}

export function requireSessionSecret(): string {
  const secret = env().SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET must be set to at least 32 characters (openssl rand -base64 48).',
    );
  }
  return secret;
}

/** Test hook: forget the cached env after mutating process.env. */
export function resetEnvCache() {
  cached = undefined;
}
