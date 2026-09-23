/**
 * WhatsApp redirect + anonymous intent logging. The redirect must be fast and must work even
 * when the database is down: labels come from a small in-memory cache with a hard timeout,
 * and logging is fire-and-forget.
 */
import { env } from '../config/env';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../whatsapp/message';
import type { WhatsAppGoParams, BeaconEvent, EventType } from '../validation/lead';
import { findRouteLabels } from '../repositories/routes';
import { insertLeadIntent } from '../repositories/leads';

type Labels = Awaited<ReturnType<typeof findRouteLabels>>;
const LABEL_TTL_MS = 60_000;
const LABEL_TIMEOUT_MS = 400;
const labelCache = new Map<string, { at: number; value: Labels }>();

export interface LeadDeps {
  findLabels: (slug: string) => Promise<Labels>;
  insert: typeof insertLeadIntent;
  businessNumber: () => string;
  log: (msg: string, err: unknown) => void;
}

const defaultDeps: LeadDeps = {
  findLabels: findRouteLabels,
  insert: insertLeadIntent,
  businessNumber: () => env().BUSINESS_WHATSAPP_NUMBER,
  log: (msg, err) => console.error(`[leads] ${msg}`, err instanceof Error ? err.message : err),
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function labelsFor(slug: string | undefined, deps: LeadDeps): Promise<Labels> {
  if (!slug) return null;
  const hit = labelCache.get(slug);
  if (hit && Date.now() - hit.at < LABEL_TTL_MS) return hit.value;
  try {
    const value = await withTimeout(deps.findLabels(slug), LABEL_TIMEOUT_MS);
    labelCache.set(slug, { at: Date.now(), value });
    return value;
  } catch (err) {
    deps.log('route label lookup failed; sending generic message', err);
    return hit?.value ?? null;
  }
}

export function clearLabelCache() {
  labelCache.clear();
}

function attribution(p: {
  utm_source?: string | undefined;
  utm_medium?: string | undefined;
  utm_campaign?: string | undefined;
  utm_term?: string | undefined;
  utm_content?: string | undefined;
  ref?: string | undefined;
}) {
  return {
    referrerHost: p.ref ?? null,
    utmSource: p.utm_source ?? null,
    utmMedium: p.utm_medium ?? null,
    utmCampaign: p.utm_campaign ?? null,
    utmTerm: p.utm_term ?? null,
    utmContent: p.utm_content ?? null,
  };
}

/** Resolve the wa.me URL for a CTA and log the click without blocking the redirect. */
export async function resolveWhatsAppRedirect(
  params: WhatsAppGoParams,
  opts: { log: boolean },
  deps: LeadDeps = defaultDeps,
): Promise<string> {
  const labels = await labelsFor(params.route, deps);
  const leg = params.day ? labels?.days.get(params.day) : undefined;
  const message = buildWhatsAppMessage({
    routeLabel: labels?.label ?? null,
    day: params.day && leg ? { number: params.day, leg } : null,
  });

  if (opts.log) {
    void deps
      .insert({
        eventType: 'whatsapp_click',
        routeId: labels?.id ?? null,
        dayNumber: leg ? (params.day ?? null) : null,
        ctaLocation: params.cta,
        ...attribution(params),
      })
      .catch((err: unknown) => deps.log('whatsapp_click not recorded', err));
  }
  return buildWhatsAppUrl(message, deps.businessNumber());
}

/** Beacon events (route_view, route_day_interest). Unknown routes are ignored. */
export async function recordBeaconEvent(
  event: BeaconEvent,
  deps: LeadDeps = defaultDeps,
): Promise<boolean> {
  const labels = await labelsFor(event.route, deps);
  if (!labels) return false;
  const type: EventType = event.type;
  try {
    await deps.insert({
      eventType: type,
      routeId: labels.id,
      dayNumber: event.day && labels.days.has(event.day) ? event.day : null,
      ctaLocation: null,
      ...attribution(event),
    });
    return true;
  } catch (err) {
    deps.log(`${type} not recorded`, err);
    return false;
  }
}
