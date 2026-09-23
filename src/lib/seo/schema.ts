/**
 * schema.org builders. Only facts we actually hold: no ratings, prices, addresses, phone numbers,
 * availability or fleet sizes — add those only once verified.
 */
import { SITE } from '../config/site';
import type { RouteView } from '../domain/types';
import { absoluteUrl, routePath } from './meta';

type Json = Record<string, unknown>;

export function organizationSchema(site: string | URL): Json {
  return {
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization', site).replace(/\/$/, ''),
    name: SITE.name,
    url: absoluteUrl('/', site),
    description: 'Private Innova Crysta transport for Spiti Valley road journeys.',
  };
}

export function webPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  site: string | URL;
}): Json {
  return {
    '@type': 'WebPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    publisher: { '@id': organizationSchema(opts.site)['@id'] },
  };
}

export function breadcrumbSchema(
  items: { name: string; path: string }[],
  site: string | URL,
): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path, site),
    })),
  };
}

export function touristTripSchema(route: RouteView, site: string | URL, url?: string): Json {
  return {
    '@type': 'TouristTrip',
    name: route.name,
    description: route.summary,
    url: url ?? absoluteUrl(routePath(route.slug), site),
    provider: { '@id': organizationSchema(site)['@id'] },
    itinerary: {
      '@type': 'ItemList',
      numberOfItems: route.days.length,
      itemListElement: route.days.map((day) => ({
        '@type': 'ListItem',
        position: day.dayNumber,
        name: `Day ${day.dayNumber}: ${day.title}`,
        description: [day.shortDescription, day.note].filter(Boolean).join(' '),
      })),
    },
  };
}

/** Wraps nodes in one @graph document. */
export function graph(...nodes: Json[]): Json {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/** Safe for embedding inside <script type="application/ld+json">. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
