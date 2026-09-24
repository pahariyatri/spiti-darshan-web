/**
 * schema.org builders. Only facts we actually hold: no ratings, addresses, availability or fleet
 * sizes — add those only once verified. (The WhatsApp number and winter car prices are
 * owner-supplied.)
 */
import { SITE } from '../config/site';
import { businessWhatsApp } from '../config/env';
import type { RouteView } from '../domain/types';
import { absoluteUrl, routePath } from './meta';

type Json = Record<string, unknown>;

export function organizationSchema(site: string | URL): Json {
  return {
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization', site).replace(/\/$/, ''),
    name: SITE.name,
    url: absoluteUrl('/', site),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/brand/spiti-darshan-logo.png', site),
      width: 512,
      height: 512,
      caption: SITE.name,
    },
    description: 'Innova Crysta transport for Spiti Valley road journeys.',
    // Owner-verified WhatsApp business number.
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: `+${businessWhatsApp().digits}`,
      contactType: 'customer service',
    },
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
    ...(route.carPrice
      ? {
          offers: {
            '@type': 'Offer',
            description: 'Innova Crysta with driver, car price for your group',
            price: route.carPrice,
            priceCurrency: 'INR',
          },
        }
      : {}),
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

export function articleSchema(opts: {
  headline: string;
  description: string;
  url: string;
  dateModified: string;
  site: string | URL;
}): Json {
  const org = { '@id': organizationSchema(opts.site)['@id'] };
  return {
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: opts.url,
    dateModified: opts.dateModified,
    author: org,
    publisher: org,
  };
}

/** Wraps nodes in one @graph document. */
/** The winter offer: car price for the group per trip length (homestays priced separately). */
export function winterTripSchema(
  trips: readonly { slug: string; nights: number; days: number; price: number }[],
  site: string | URL,
): Json {
  return {
    '@type': 'TouristTrip',
    name: 'Winter Spiti by Innova Crysta',
    description:
      'White Spiti road trip via Kinnaur with an Innova Crysta and driver for your group. Homestays with breakfast and dinner are priced separately.',
    url: absoluteUrl('/#winter', site),
    touristType: 'Private group',
    provider: { '@id': organizationSchema(site)['@id'] },
    offers: trips.map((t) => ({
      '@type': 'Offer',
      name: `${t.nights} nights / ${t.days} days`,
      description: 'Innova Crysta with driver, car price for your group',
      price: t.price,
      priceCurrency: 'INR',
      url: absoluteUrl(routePath(t.slug), site),
    })),
  };
}

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
