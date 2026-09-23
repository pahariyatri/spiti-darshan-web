import { z } from 'astro/zod';
import { CTA_LOCATIONS } from '../config/site';

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(128);
const utm = z
  .string()
  .max(100)
  .transform((v) => v.replace(/[^\w .\-+|]/g, '').trim())
  .optional()
  .catch(undefined);

export const attributionSchema = z.object({
  utm_source: utm,
  utm_medium: utm,
  utm_campaign: utm,
  utm_term: utm,
  utm_content: utm,
  /** Referrer *host only* — never a full URL (query strings can carry personal data). */
  ref: z
    .string()
    .max(253)
    .regex(/^[a-z0-9.-]+$/i)
    .optional()
    .catch(undefined),
});

/** /go/whatsapp/ query. Invalid optional fields degrade to undefined — the redirect must never fail. */
export const whatsappGoSchema = attributionSchema.extend({
  route: slug.optional().catch(undefined),
  day: z.coerce.number().int().min(1).max(60).optional().catch(undefined),
  cta: z.enum(CTA_LOCATIONS).catch('page'),
});
export type WhatsAppGoParams = z.infer<typeof whatsappGoSchema>;

export const EVENT_TYPES = ['whatsapp_click', 'route_view', 'route_day_interest'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Beacon payload for /api/event/ (whatsapp_click is logged server-side by the redirect). */
export const beaconEventSchema = attributionSchema.extend({
  type: z.enum(['route_view', 'route_day_interest']),
  route: slug,
  day: z.number().int().min(1).max(60).optional(),
});
export type BeaconEvent = z.infer<typeof beaconEventSchema>;

/** Query-string → plain object, first value wins. */
export function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of params) if (!(k in out)) out[k] = v;
  return out;
}
