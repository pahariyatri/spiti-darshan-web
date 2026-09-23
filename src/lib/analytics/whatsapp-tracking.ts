/**
 * WhatsApp click tracking (browser). Records CTA location, page, route/day and UTM tags.
 * Never blocks the link: no preventDefault, everything wrapped in try/catch, and the event is
 * handed to GA4 with beacon transport so it survives the tab switching to WhatsApp.
 */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const STORE = 'sd_utm';

type Params = Record<string, string | number | undefined>;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readUtm(): Params {
  try {
    const fresh: Params = {};
    const q = new URLSearchParams(location.search);
    for (const k of UTM_KEYS) if (q.get(k)) fresh[k] = q.get(k)!.slice(0, 100);
    if (Object.keys(fresh).length) sessionStorage.setItem(STORE, JSON.stringify(fresh));
    return fresh.utm_source ? fresh : (JSON.parse(sessionStorage.getItem(STORE) ?? '{}') as Params);
  } catch {
    return {};
  }
}

function loadGa4(id: string) {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export function whatsappClickParams(link: HTMLAnchorElement, utm: Params): Params {
  return {
    cta_location: link.dataset.cta,
    page_path: location.pathname,
    route: link.dataset.route,
    day: link.dataset.day ? Number(link.dataset.day) : undefined,
    ...utm,
  };
}

export function initWhatsAppTracking() {
  const utm = readUtm();
  const ga4 = document.querySelector<HTMLMetaElement>('meta[name="ga4-id"]')?.content;
  try {
    if (ga4) loadGa4(ga4);
  } catch {
    /* analytics must never affect the page */
  }
  document.addEventListener(
    'click',
    (event) => {
      try {
        const link = (event.target as Element | null)?.closest?.('a.whatsapp-link');
        if (!(link instanceof HTMLAnchorElement)) return;
        const params = whatsappClickParams(link, utm);
        window.dataLayer = window.dataLayer ?? [];
        window.dataLayer.push({ event: 'whatsapp_click', ...params });
        window.gtag?.('event', 'whatsapp_click', { ...params, transport_type: 'beacon' });
      } catch {
        /* tracking failure must never block WhatsApp */
      }
    },
    { capture: true },
  );
}
