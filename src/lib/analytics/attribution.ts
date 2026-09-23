/**
 * Browser-only, anonymous attribution. No cookies, no identifiers, no fingerprinting:
 * UTM tags and the *host* of an external referrer are kept in sessionStorage for this tab
 * and attached to WhatsApp redirects and route beacons.
 */
const KEY = 'sd_attr';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
type Attribution = Partial<Record<(typeof UTM_KEYS)[number] | 'ref', string>>;

function load(): Attribution {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Attribution;
  } catch {
    return {};
  }
}

function save(a: Attribution) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* private mode: attribution is best-effort */
  }
}

export function captureAttribution(): Attribution {
  const stored = load();
  const params = new URLSearchParams(location.search);
  const fresh: Attribution = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) fresh[k] = v.slice(0, 100);
  }
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : '';
    if (host && host !== location.hostname) fresh.ref = host;
  } catch {
    /* ignore malformed referrer */
  }
  // A new campaign landing replaces the old attribution; otherwise keep first touch.
  const next =
    fresh.utm_source || (fresh.ref && !stored.ref) ? { ...fresh } : { ...fresh, ...stored };
  save(next);
  return next;
}

export function decorateWhatsAppLinks(attr: Attribution) {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/go/whatsapp/"]').forEach((a) => {
    const url = new URL(a.href, location.origin);
    for (const [k, v] of Object.entries(attr)) if (v) url.searchParams.set(k, v);
    a.href = url.pathname + url.search;
  });
}

function beacon(payload: Record<string, unknown>) {
  const body = JSON.stringify({ ...load(), ...payload });
  try {
    if (navigator.sendBeacon?.('/api/event/', new Blob([body], { type: 'application/json' })))
      return;
    void fetch('/api/event/', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    /* analytics must never affect the page */
  }
}

const sentDays = new Set<string>();
export function trackDayInterest(route: string, day: number) {
  const key = `${route}:${day}`;
  if (sentDays.has(key)) return;
  sentDays.add(key);
  beacon({ type: 'route_day_interest', route, day });
}

export function trackRouteView(route: string) {
  beacon({ type: 'route_view', route });
}

export function initAttribution() {
  const attr = captureAttribution();
  decorateWhatsAppLinks(attr);
  const route = document.body.dataset.trackRoute;
  if (route) trackRouteView(route);
}
