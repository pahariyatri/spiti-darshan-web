/**
 * Idempotent seed. Reference data (media, places, vehicles) is inserted if missing; a route is
 * created only when its slug does not exist yet — unless `force`, which rebuilds seed routes
 * (development/test only: it discards admin edits to those routes).
 */
import { eq, inArray } from 'drizzle-orm';
import type { Database } from '../client';
import * as s from '../schema';
import { allStaticMedia } from '../../media/static-media';
import { attractions, destinations, routes, vehicles, type SeedRoute } from './data';
import { ROUTE_ENTITY } from '../../repositories/routes';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

async function idMap<T extends { id: number }>(rows: T[], key: (r: T) => string) {
  return new Map(rows.map((r) => [key(r), r.id]));
}

export async function seedDatabase(database: Database, { force = false } = {}) {
  return database.transaction(async (tx) => {
    const media = allStaticMedia();
    await tx
      .insert(s.mediaAssets)
      .values(
        media.map((m) => ({
          basePath: m.basePath,
          alt: m.alt,
          width: m.width,
          height: m.height,
          variantWidths: m.widths,
          formats: m.formats,
          fallbackFormat: m.fallbackFormat,
          credit: m.credit,
          license: m.license,
          sourceUrl: m.sourceUrl,
          note: m.note,
        })),
      )
      .onConflictDoNothing({ target: s.mediaAssets.basePath });
    await tx
      .insert(s.destinations)
      .values(destinations)
      .onConflictDoNothing({ target: s.destinations.slug });

    const mediaIds = await idMap(await tx.select().from(s.mediaAssets), (m) =>
      m.basePath.replace(/^\/media\//, ''),
    );
    const destIds = await idMap(await tx.select().from(s.destinations), (d) => d.slug);

    await tx
      .insert(s.attractions)
      .values(
        attractions.map((a) => ({
          slug: a.slug,
          name: a.name,
          destinationId: a.destination ? (destIds.get(a.destination) ?? null) : null,
          attractionType: a.type,
          isOptional: a.isOptional ?? false,
        })),
      )
      .onConflictDoNothing({ target: s.attractions.slug });
    await tx
      .insert(s.vehicles)
      .values(
        vehicles.map((v) => ({
          slug: v.slug,
          name: v.name,
          vehicleType: v.vehicleType,
          mediaId: mediaIds.get(v.media) ?? null,
        })),
      )
      .onConflictDoNothing({ target: s.vehicles.slug });

    const attrIds = await idMap(await tx.select().from(s.attractions), (a) => a.slug);
    const vehicleIds = await idMap(await tx.select().from(s.vehicles), (v) => v.slug);
    const ctx = { mediaIds, destIds, attrIds, vehicleIds };

    const created: string[] = [];
    for (const route of routes) {
      const existing = await tx
        .select({ id: s.routes.id })
        .from(s.routes)
        .where(eq(s.routes.slug, route.slug));
      if (existing.length && !force) continue;
      if (existing.length) {
        const ids = existing.map((r) => r.id);
        await tx.delete(s.seoMetadata).where(inArray(s.seoMetadata.entityId, ids));
        await tx.delete(s.routes).where(inArray(s.routes.id, ids));
      }
      await insertRoute(tx, route, ctx);
      created.push(route.slug);
    }
    return { created };
  });
}

async function insertRoute(
  tx: Tx,
  route: SeedRoute,
  ctx: Record<'mediaIds' | 'destIds' | 'attrIds' | 'vehicleIds', Map<string, number>>,
) {
  const [row] = await tx
    .insert(s.routes)
    .values({
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
      heroKicker: route.hero.kicker,
      heroTitle: route.hero.title,
      heroTitleAccent: route.hero.titleAccent,
      heroMediaId: ctx.mediaIds.get(route.hero.media) ?? null,
      publishedAt: new Date(),
    })
    .returning({ id: s.routes.id });
  const routeId = row!.id;

  for (const [i, day] of route.days.entries()) {
    const [dayRow] = await tx
      .insert(s.routeDays)
      .values({
        routeId,
        dayNumber: day.dayNumber,
        title: day.title,
        subtitle: day.subtitle,
        mapLegLabel: day.mapLegLabel,
        shortDescription: day.shortDescription,
        dayNote: day.note,
        isSeasonal: day.isSeasonal ?? false,
        overnightDestinationId: day.overnight ? (ctx.destIds.get(day.overnight) ?? null) : null,
        mediaId: day.media ? (ctx.mediaIds.get(day.media) ?? null) : null,
        mapSegment: day.mapSegment,
        displayOrder: i + 1,
      })
      .returning({ id: s.routeDays.id });
    await tx.insert(s.routeDayStops).values(
      day.stops.map((stop, j) => ({
        routeDayId: dayRow!.id,
        destinationId: stop.destination ? (ctx.destIds.get(stop.destination) ?? null) : null,
        attractionId: stop.attraction ? (ctx.attrIds.get(stop.attraction) ?? null) : null,
        stopName: stop.name,
        mapLabel: stop.mapLabel ?? null,
        stopType: stop.type,
        displayOrder: j + 1,
        isOptional: stop.optional ?? false,
        isSeasonal: stop.seasonal ?? false,
        showOnMap: stop.showOnMap ?? true,
      })),
    );
  }

  await tx.insert(s.routeVehicleTypes).values(
    route.vehicles.flatMap((slug) => {
      const vehicleId = ctx.vehicleIds.get(slug);
      return vehicleId ? [{ routeId, vehicleId }] : [];
    }),
  );
  await tx.insert(s.seoMetadata).values({
    entityType: ROUTE_ENTITY,
    entityId: routeId,
    metaTitle: route.seo.metaTitle,
    metaDescription: route.seo.metaDescription,
    ogTitle: route.seo.ogTitle,
    ogDescription: route.seo.ogDescription,
  });
}
