import { existsSync } from 'node:fs';
import { z } from 'astro/zod';
import { SITE } from './site';

// Local convenience: load `.env` without overriding variables set by the host (Vercel, CI).
if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* unreadable .env is treated as absent */
  }
}

const EnvSchema = z.object({
  /** Optional override of the verified business WhatsApp number in SITE.whatsapp. */
  BUSINESS_WHATSAPP_NUMBER: z
    .string()
    .optional()
    .transform((v) => (v ?? '').replace(/\D/g, ''))
    .refine((v) => v === '' || (v.length >= 8 && v.length <= 15), {
      message: 'BUSINESS_WHATSAPP_NUMBER must be country code + 8–15 digits, or empty',
    }),
});

type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Validated build-time environment. Throws a readable error on misconfiguration. */
function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** The WhatsApp number every CTA uses: env override, else the verified number in SITE. */
export function businessWhatsApp(): { digits: string; display: string } {
  const override = env().BUSINESS_WHATSAPP_NUMBER;
  return override ? { digits: override, display: `+${override}` } : SITE.whatsapp;
}
