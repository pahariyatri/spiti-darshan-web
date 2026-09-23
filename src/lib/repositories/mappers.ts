import type { MediaView, RouteView, StopType } from '../domain/types';
import type * as s from '../db/schema';

type MediaRow = typeof s.mediaAssets.$inferSelect;

export function toMediaView(row: MediaRow | null | undefined): MediaView | null {
  if (!row) return null;
  return {
    basePath: row.basePath,
    alt: row.alt,
    width: row.width,
    height: row.height,
    widths: [...row.variantWidths].sort((a, b) => a - b),
    formats: row.formats,
    fallbackFormat: row.fallbackFormat,
  };
}

type StopRow = typeof s.routeDayStops.$inferSelect & {
  destination: typeof s.destinations.$inferSelect | null;
  attraction: typeof s.attractions.$inferSelect | null;
};
type DayRow = typeof s.routeDays.$inferSelect & {
  stops: StopRow[];
  overnight: typeof s.destinations.$inferSelect | null;
  media: MediaRow | null;
};
export type RouteRow = typeof s.routes.$inferSelect & {
  days: DayRow[];
  heroMedia: MediaRow | null;
  vehicles: { vehicle: typeof s.vehicles.$inferSelect & { media: MediaRow | null } }[];
};
type SeoRow = (typeof s.seoMetadata.$inferSelect & { ogImage: MediaRow | null }) | undefined;

const byOrder = <T extends { displayOrder: number; id: number }>(a: T, b: T) =>
  a.displayOrder - b.displayOrder || a.id - b.id;

export function toRouteView(row: RouteRow, seo: SeoRow): RouteView {
  const days = [...row.days].sort((a, b) => byOrder(a, b) || a.dayNumber - b.dayNumber);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortTitle: row.shortTitle,
    summary: row.summary,
    startingLocation: row.startingLocation,
    endingLocation: row.endingLocation,
    durationDays: days.length || row.durationDays,
    routeType: row.routeType,
    seasonality: row.seasonality,
    status: row.status,
    isFeatured: row.isFeatured,
    hero: {
      kicker: row.heroKicker,
      title: row.heroTitle || row.shortTitle,
      titleAccent: row.heroTitleAccent,
      media: toMediaView(row.heroMedia),
    },
    days: days.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      subtitle: d.subtitle,
      mapLegLabel: d.mapLegLabel,
      shortDescription: d.shortDescription,
      note: d.dayNote,
      isSeasonal: d.isSeasonal,
      overnight: d.overnight?.name ?? null,
      media: toMediaView(d.media),
      mapSegment: d.mapSegment,
      stops: [...d.stops].sort(byOrder).map((st) => ({
        name: st.stopName,
        mapLabel: st.mapLabel,
        type: st.stopType as StopType,
        isOptional: st.isOptional,
        isSeasonal: st.isSeasonal,
        showOnMap: st.showOnMap,
        destinationSlug: st.destination?.slug ?? null,
        attractionSlug: st.attraction?.slug ?? null,
      })),
    })),
    vehicles: row.vehicles
      .map(({ vehicle }) => vehicle)
      .filter((v) => v.active)
      .map((v) => ({
        slug: v.slug,
        name: v.name,
        vehicleType: v.vehicleType,
        media: toMediaView(v.media),
      })),
    seo: seo
      ? {
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          canonicalPath: seo.canonicalPath,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          ogImage: toMediaView(seo.ogImage),
          robots: seo.robots,
        }
      : null,
    updatedAt: row.updatedAt,
  };
}
