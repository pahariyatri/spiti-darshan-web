/** Seed data → RouteView without a database. Used by tests as the reference rendering. */
import type { RouteView } from '../../domain/types';
import { staticMedia, toMediaView } from '../../media/static-media';
import { destinations, vehicles, type SeedRoute } from './data';

const media = (stem: string | null) => (stem ? toMediaView(staticMedia(stem)) : null);
const destName = (slug: string | null) => destinations.find((d) => d.slug === slug)?.name ?? null;

export function seedRouteToView(route: SeedRoute): RouteView {
  return {
    id: null,
    slug: route.slug,
    name: route.name,
    shortTitle: route.shortTitle,
    summary: route.summary,
    startingLocation: route.startingLocation,
    endingLocation: route.endingLocation,
    durationDays: route.days.length,
    routeType: route.routeType,
    seasonality: route.seasonality,
    status: 'published',
    isFeatured: route.isFeatured,
    hero: { ...route.hero, media: media(route.hero.media) },
    days: route.days.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      subtitle: d.subtitle,
      mapLegLabel: d.mapLegLabel,
      shortDescription: d.shortDescription,
      note: d.note,
      isSeasonal: d.isSeasonal ?? false,
      overnight: destName(d.overnight),
      media: media(d.media),
      mapSegment: d.mapSegment,
      stops: d.stops.map((s) => ({
        name: s.name,
        mapLabel: s.mapLabel ?? null,
        type: s.type,
        isOptional: s.optional ?? false,
        isSeasonal: s.seasonal ?? false,
        showOnMap: s.showOnMap ?? true,
        destinationSlug: s.destination ?? null,
        attractionSlug: s.attraction ?? null,
      })),
    })),
    vehicles: vehicles
      .filter((v) => route.vehicles.includes(v.slug))
      .map((v) => ({
        slug: v.slug,
        name: v.name,
        vehicleType: v.vehicleType,
        media: media(v.media),
      })),
    seo: {
      metaTitle: route.seo.metaTitle,
      metaDescription: route.seo.metaDescription,
      canonicalPath: null,
      ogTitle: route.seo.ogTitle,
      ogDescription: route.seo.ogDescription,
      ogImage: null,
      robots: null,
    },
    updatedAt: null,
  };
}
