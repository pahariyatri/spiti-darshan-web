import { existsSync } from 'node:fs';
import { z } from 'astro/zod';
import { formatPhone } from '../whatsapp/message';

// Local convenience: load `.env` without overriding variables set by the host (Vercel, CI).
if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* unreadable .env is treated as absent */
  }
}

const EnvSchema = z.object({
  /** The business WhatsApp number (country code + digits). Required: every CTA depends on it. */
  BUSINESS_WHATSAPP_NUMBER: z
    .string({
      error: 'BUSINESS_WHATSAPP_NUMBER is required (e.g. 916230070301). Set it in .env or Vercel.',
    })
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 10 && v.length <= 15, {
      message: 'BUSINESS_WHATSAPP_NUMBER must be country code + number, 10–15 digits',
    }),
  /** Optional Google Analytics 4 measurement ID (G-XXXXXXX) for WhatsApp click tracking. */
  PUBLIC_GA4_ID: z
    .string()
    .regex(/^G-[A-Z0-9]{4,12}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

type Env = z.infer<typeof EnvSchema>;
let cached: Env | undefined;

/** Validated build-time environment. A missing/invalid number fails the build with a clear message. */
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

/** The single business WhatsApp number every CTA, the footer and structured data use. */
export function businessWhatsApp(): { digits: string; display: string } {
  const digits = env().BUSINESS_WHATSAPP_NUMBER;
  return { digits, display: formatPhone(digits) };
}
