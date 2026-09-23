/** Read side for routes. The only module that knows how route rows are joined. */
import { and, asc, desc, eq, type SQL } from 'drizzle-orm';
import { db, schema as s } from '../db/client';
import type { RouteSummary, RouteView } from '../domain/types';
import { toRouteView, type RouteRow } from './mappers';

export const ROUTE_ENTITY = 'route';

async function loadRoute(where: SQL | undefined): Promise<RouteView | null> {
  const row = await db().query.routes.findFirst({
    where,
    with: {
      heroMedia: true,
      vehicles: { with: { vehicle: { with: { media: true } } } },
      days: {
        orderBy: [asc(s.routeDays.displayOrder), asc(s.routeDays.dayNumber)],
        with: {
          overnight: true,
          media: true,
          stops: {
            orderBy: [asc(s.routeDayStops.displayOrder), asc(s.routeDayStops.id)],
            with: { destination: true, attraction: true },
          },
        },
      },
    },
  });
  if (!row) return null;
  const seo = await db().query.seoMetadata.findFirst({
    where: and(eq(s.seoMetadata.entityType, ROUTE_ENTITY), eq(s.seoMetadata.entityId, row.id)),
    with: { ogImage: true },
  });
  return toRouteView(row as RouteRow, seo);
}

/** Public lookup: published routes only. */
export function findPublishedRouteBySlug(slug: string) {
  return loadRoute(and(eq(s.routes.slug, slug), eq(s.routes.status, 'published')));
}

/** Admin/preview lookup: any status. */
export function findRouteById(id: number) {
  return loadRoute(eq(s.routes.id, id));
}

export function findFeaturedRoute() {
  return loadRoute(and(eq(s.routes.isFeatured, true), eq(s.routes.status, 'published')));
}

export async function listPublishedRoutes(): Promise<RouteSummary[]> {
  const rows = await db()
    .select({
      slug: s.routes.slug,
      name: s.routes.name,
      shortTitle: s.routes.shortTitle,
      summary: s.routes.summary,
      durationDays: s.routes.durationDays,
      startingLocation: s.routes.startingLocation,
      endingLocation: s.routes.endingLocation,
      updatedAt: s.routes.updatedAt,
    })
    .from(s.routes)
    .where(eq(s.routes.status, 'published'))
    .orderBy(desc(s.routes.isFeatured), asc(s.routes.name));
  return rows;
}

/** Minimal label lookup for WhatsApp messages (cached by the caller). */
export async function findRouteLabels(slug: string) {
  const row = await db().query.routes.findFirst({
    where: and(eq(s.routes.slug, slug), eq(s.routes.status, 'published')),
    columns: { id: true, shortTitle: true },
    with: { days: { columns: { dayNumber: true, mapLegLabel: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    label: row.shortTitle,
    days: new Map(row.days.map((d) => [d.dayNumber, d.mapLegLabel])),
  };
}
