/** Business-wide constants. Only verified facts belong here — never invent contact data. */
export const SITE = {
  name: 'Spiti Darshan',
  brandMark: 'SD',
  tagline: 'Private road journeys',
  footerTagline: 'Private Spiti transport',
  themeColor: '#10211c',
  locale: 'en_IN',
  defaultOgImage: '/media/hero-vehicles-1200.jpg',
  officialRouteGuidance: {
    label: 'official district route guidance',
    url: 'https://hplahaulspiti.nic.in/how-to-reach/',
  },
} as const;

/** Stable identifiers for CTA placements, used in /go/whatsapp and analytics. */
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
