/** Business-wide constants. Only verified facts belong here — never invent contact data. */
export const SITE = {
  name: 'Spiti Darshan',
  brandMark: 'SD',
  tagline: 'Private road journeys',
  footerTagline: 'Private Spiti transport',
  themeColor: '#10211c',
  /** Verified business WhatsApp number (owner-supplied 2026-09-23). Env BUSINESS_WHATSAPP_NUMBER overrides. */
  whatsapp: { digits: '916230070301', display: '+91 62300 70301' },
  locale: 'en_IN',
  defaultOgImage: '/media/hero-vehicles-og.jpg',
  officialRouteGuidance: {
    label: 'official district route guidance',
    url: 'https://hplahaulspiti.nic.in/how-to-reach/',
  },
} as const;

/** Stable identifiers for CTA placements (data-cta on every WhatsApp link). */
export const CTA_LOCATIONS = [
  'header',
  'hero',
  'day-card',
  'contact',
  'mobile-bar',
  'route-facts',
  'page',
] as const;
export type CtaLocation = (typeof CTA_LOCATIONS)[number];
