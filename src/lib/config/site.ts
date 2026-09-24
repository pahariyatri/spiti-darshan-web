/** Business-wide constants. Only verified facts belong here — never invent contact data. */
export const SITE = {
  name: 'Spiti Darshan',
  brandMark: 'SD',
  tagline: 'Spiti journeys, planned with you',
  footerTagline: 'Innova Crysta journeys',
  themeColor: '#10211c',
  locale: 'en_IN',
  defaultOgImage: '/media/hero-vehicles-og.jpg',
  officialRouteGuidance: {
    label: 'official district route guidance',
    url: 'https://hplahaulspiti.nic.in/how-to-reach/',
  },
} as const;

/** Stable identifiers for CTA placements (data-cta on every WhatsApp link). */
export type CtaLocation =
  'header' | 'hero' | 'day-card' | 'contact' | 'mobile-bar' | 'route-facts' | 'page';
