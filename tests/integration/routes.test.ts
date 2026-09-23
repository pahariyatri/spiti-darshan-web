import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDb, db, schema as s } from '../../src/lib/db/client';
import {
  findFeaturedRoute,
  findPublishedRouteBySlug,
  findRouteById,
  listPublishedRoutes,
} from '../../src/lib/repositories/routes';
import { seedRouteToView } from '../../src/lib/db/seed/to-view';
import { shimlaToSpiti } from '../../src/lib/db/seed/data';
import { seedDatabase } from '../../src/lib/db/seed/seed';
import * as admin from '../../src/lib/services/admin';

afterAll(() => closeDb());

const strip = <T extends { id: number | null; updatedAt: Date | null }>(r: T) => ({
  ...r,
  id: null,
  updatedAt: null,
});

describe('seed + route lookup', () => {
  it('reproduces the approved itinerary exactly from the database', async () => {
    const fromDb = await findPublishedRouteBySlug('shimla-to-spiti');
    expect(fromDb).not.toBeNull();
    const expected = seedRouteToView(shimlaToSpiti);
    expect(strip(fromDb!)).toEqual({ ...strip(expected), seo: { ...expected.seo } });
  });

  it('keeps optional and seasonal qualifiers', async () => {
    const route = (await findPublishedRouteBySlug('shimla-to-spiti'))!;
    const stops = route.days.flatMap((d) => d.stops);
    expect(stops.filter((st) => st.isOptional).map((st) => st.name)).toEqual([
      'Chitkul',
      'Gue',
      'Pin Valley',
    ]);
    expect(route.days.filter((d) => d.isSeasonal).map((d) => d.dayNumber)).toEqual([8, 9]);
  });

  it('returns null for unknown slugs and is the featured route', async () => {
    expect(await findPublishedRouteBySlug('no-such-route')).toBeNull();
    expect((await findFeaturedRoute())?.slug).toBe('shimla-to-spiti');
  });

  it('seeding again is a no-op', async () => {
    expect((await seedDatabase(db())).created).toEqual([]);
  });
});

describe('admin: create, order, publish', () => {
  let routeId = 0;

  it('creates drafts that are not public', async () => {
    routeId = await admin.createRoute({
      slug: 'chandigarh-to-spiti',
      name: 'Chandigarh to Spiti',
      shortTitle: 'Chandigarh → Kaza',
      summary: 'Integration test route.',
      startingLocation: 'Chandigarh',
      endingLocation: 'Kaza',
    });
    expect(await findPublishedRouteBySlug('chandigarh-to-spiti')).toBeNull();
    expect((await findRouteById(routeId))?.status).toBe('draft');
    await expect(
      admin.createRoute({
        slug: 'chandigarh-to-spiti',
        name: 'x',
        shortTitle: 'x',
        summary: 'x',
        startingLocation: 'x',
        endingLocation: 'x',
      }),
    ).rejects.toThrow(/already used/);
  });

  it('keeps day numbers contiguous through add, move and delete', async () => {
    const day = {
      subtitle: null,
      mapLegLabel: null,
      shortDescription: null,
      dayNote: null,
      isSeasonal: false,
      overnightDestinationId: null,
      mediaId: null,
      mapSegment: null,
    };
    const a = await admin.addDay(routeId, { ...day, title: 'A' });
    await admin.addDay(routeId, { ...day, title: 'B' });
    const c = await admin.addDay(routeId, { ...day, title: 'C' });
    await admin.moveDay(c, 'up');
    let view = (await findRouteById(routeId))!;
    expect(view.days.map((d) => [d.dayNumber, d.title])).toEqual([
      [1, 'A'],
      [2, 'C'],
      [3, 'B'],
    ]);
    await admin.deleteDay(a);
    view = (await findRouteById(routeId))!;
    expect(view.days.map((d) => [d.dayNumber, d.title])).toEqual([
      [1, 'C'],
      [2, 'B'],
    ]);
    const [route] = await db().select().from(s.routes).where(eq(s.routes.id, routeId));
    expect(route!.durationDays).toBe(2);
  });

  it('orders stops by display order and supports moving them', async () => {
    const view = (await findRouteById(routeId))!;
    const [dayRow] = await db()
      .select()
      .from(s.routeDays)
      .where(eq(s.routeDays.routeId, routeId))
      .orderBy(s.routeDays.displayOrder);
    const stop = {
      mapLabel: null,
      destinationId: null,
      attractionId: null,
      isOptional: false,
      isSeasonal: false,
      showOnMap: true,
    };
    await admin.addStop(dayRow!.id, { ...stop, stopName: 'One', stopType: 'start' });
    const two = await admin.addStop(dayRow!.id, { ...stop, stopName: 'Two', stopType: 'stop' });
    await admin.moveStop(two, 'up');
    const after = (await findRouteById(routeId))!;
    expect(after.days[0]!.stops.map((st) => st.name)).toEqual(['Two', 'One']);
    expect(view.days).toHaveLength(2);
  });

  it('refuses to publish incomplete routes, then publishes and unpublishes', async () => {
    const blocked = await admin.setRouteStatus(routeId, 'published');
    expect(blocked.ok).toBe(false);
    const [media] = await db().select().from(s.mediaAssets).limit(1);
    await db().update(s.routes).set({ heroMediaId: media!.id }).where(eq(s.routes.id, routeId));
    const days = await db().select().from(s.routeDays).where(eq(s.routeDays.routeId, routeId));
    for (const d of days.slice(1)) {
      await admin.addStop(d.id, {
        stopName: 'Kaza',
        stopType: 'overnight',
        mapLabel: null,
        destinationId: null,
        attractionId: null,
        isOptional: false,
        isSeasonal: false,
        showOnMap: true,
      });
    }
    expect((await admin.setRouteStatus(routeId, 'published')).ok).toBe(true);
    expect((await findPublishedRouteBySlug('chandigarh-to-spiti'))?.slug).toBe(
      'chandigarh-to-spiti',
    );
    expect((await listPublishedRoutes()).map((r) => r.slug)).toContain('chandigarh-to-spiti');

    await admin.setRouteStatus(routeId, 'draft');
    expect(await findPublishedRouteBySlug('chandigarh-to-spiti')).toBeNull();
  });

  it('allows only one featured route', async () => {
    const featured = await db().select().from(s.routes).where(eq(s.routes.isFeatured, true));
    expect(featured).toHaveLength(1);
    await expect(
      db().update(s.routes).set({ isFeatured: true }).where(eq(s.routes.id, routeId)),
    ).rejects.toThrow();
  });
});
