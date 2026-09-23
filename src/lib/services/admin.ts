/**
 * Admin write operations. Every function is transactional where it touches more than one row
 * and keeps these invariants: day_number == position (1…n), routes.duration_days == day count,
 * routes.updated_at bumps on any content change, at most one featured route.
 */
import { and, asc, eq, gt, lt, desc, sql } from 'drizzle-orm';
import path from 'node:path';
import { db, schema as s, type Database } from '../db/client';
import type { RouteStatus } from '../domain/types';
import { findRouteById, ROUTE_ENTITY } from '../repositories/routes';
import { publishProblems } from './publish';
import type { DayInput, RouteUpdateInput, StopInput } from '../validation/route';
import { env } from '../config/env';
import { generateVariants, sanitizeStem } from '../media/variants';
import { randomBytes } from 'node:crypto';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export class AdminError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'CONFLICT' | 'BAD_REQUEST' = 'BAD_REQUEST',
  ) {
    super(message);
  }
}

/** Postgres unique_violation, whether raw or wrapped by Drizzle (DrizzleQueryError.cause). */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if ('code' in err && (err as { code: unknown }).code === '23505') return true;
  return 'cause' in err && isUniqueViolation((err as { cause: unknown }).cause);
}

async function touchRoute(tx: Tx, routeId: number) {
  const [{ n } = { n: 0 }] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(s.routeDays)
    .where(eq(s.routeDays.routeId, routeId));
  await tx
    .update(s.routes)
    .set({ updatedAt: new Date(), durationDays: Math.max(1, n) })
    .where(eq(s.routes.id, routeId));
}

/** Rewrites day_number/display_order to 1…n in the given order (two passes avoid unique clashes). */
async function renumberDays(tx: Tx, routeId: number, orderedIds: number[]) {
  await tx
    .update(s.routeDays)
    .set({
      dayNumber: sql`${s.routeDays.dayNumber} + 1000`,
      displayOrder: sql`${s.routeDays.displayOrder} + 1000`,
    })
    .where(eq(s.routeDays.routeId, routeId));
  for (const [i, id] of orderedIds.entries()) {
    await tx
      .update(s.routeDays)
      .set({ dayNumber: i + 1, displayOrder: i + 1 })
      .where(eq(s.routeDays.id, id));
  }
}

async function orderedDayIds(tx: Tx, routeId: number) {
  const rows = await tx
    .select({ id: s.routeDays.id })
    .from(s.routeDays)
    .where(eq(s.routeDays.routeId, routeId))
    .orderBy(asc(s.routeDays.displayOrder), asc(s.routeDays.dayNumber));
  return rows.map((r) => r.id);
}

async function dayRoute(tx: Tx, dayId: number) {
  const [day] = await tx
    .select({ routeId: s.routeDays.routeId })
    .from(s.routeDays)
    .where(eq(s.routeDays.id, dayId));
  if (!day) throw new AdminError('Day not found', 'NOT_FOUND');
  return day.routeId;
}

// ---------- routes ----------

export async function listRoutesForAdmin() {
  return db()
    .select({
      id: s.routes.id,
      slug: s.routes.slug,
      name: s.routes.name,
      status: s.routes.status,
      isFeatured: s.routes.isFeatured,
      durationDays: s.routes.durationDays,
      updatedAt: s.routes.updatedAt,
    })
    .from(s.routes)
    .orderBy(desc(s.routes.isFeatured), asc(s.routes.name));
}

export async function getRouteForEdit(id: number) {
  const route = await db().query.routes.findFirst({
    where: eq(s.routes.id, id),
    with: {
      vehicles: true,
      days: {
        orderBy: [asc(s.routeDays.displayOrder)],
        with: {
          stops: { orderBy: [asc(s.routeDayStops.displayOrder), asc(s.routeDayStops.id)] },
          overnight: true,
        },
      },
    },
  });
  if (!route) return null;
  const seo = await db().query.seoMetadata.findFirst({
    where: and(eq(s.seoMetadata.entityType, ROUTE_ENTITY), eq(s.seoMetadata.entityId, id)),
  });
  return { route, seo: seo ?? null };
}

export async function createRoute(input: {
  slug: string;
  name: string;
  shortTitle: string;
  summary: string;
  startingLocation: string;
  endingLocation: string;
}): Promise<number> {
  try {
    const [row] = await db()
      .insert(s.routes)
      .values({ ...input, durationDays: 1, heroTitle: input.shortTitle, status: 'draft' })
      .returning({ id: s.routes.id });
    return row!.id;
  } catch (err) {
    if (isUniqueViolation(err))
      throw new AdminError(`The slug "${input.slug}" is already used`, 'CONFLICT');
    throw err;
  }
}

export async function updateRoute(input: RouteUpdateInput) {
  const {
    id,
    vehicleIds,
    metaTitle,
    metaDescription,
    canonicalPath,
    ogTitle,
    ogDescription,
    ogImageId,
    robots,
    ...rest
  } = input;
  try {
    await db().transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: s.routes.id })
        .from(s.routes)
        .where(eq(s.routes.id, id));
      if (!existing) throw new AdminError('Route not found', 'NOT_FOUND');
      if (rest.isFeatured) {
        await tx
          .update(s.routes)
          .set({ isFeatured: false })
          .where(and(eq(s.routes.isFeatured, true), sql`${s.routes.id} <> ${id}`));
      }
      await tx
        .update(s.routes)
        .set({
          ...rest,
          seasonality: rest.seasonality ?? '',
          heroKicker: rest.heroKicker ?? '',
          heroTitle: rest.heroTitle ?? rest.shortTitle,
          heroTitleAccent: rest.heroTitleAccent ?? '',
        })
        .where(eq(s.routes.id, id));
      await tx.delete(s.routeVehicleTypes).where(eq(s.routeVehicleTypes.routeId, id));
      if (vehicleIds.length) {
        await tx
          .insert(s.routeVehicleTypes)
          .values([...new Set(vehicleIds)].map((vehicleId) => ({ routeId: id, vehicleId })));
      }
      const seo = {
        metaTitle,
        metaDescription,
        canonicalPath,
        ogTitle,
        ogDescription,
        ogImageId,
        robots,
      };
      await tx
        .insert(s.seoMetadata)
        .values({ entityType: ROUTE_ENTITY, entityId: id, ...seo })
        .onConflictDoUpdate({
          target: [s.seoMetadata.entityType, s.seoMetadata.entityId],
          set: { ...seo, updatedAt: new Date() },
        });
      await touchRoute(tx, id);
    });
  } catch (err) {
    if (isUniqueViolation(err))
      throw new AdminError(`The slug "${input.slug}" is already used`, 'CONFLICT');
    throw err;
  }
}

/** Publishing validates completeness; unpublishing/archiving is always allowed. */
export async function setRouteStatus(
  id: number,
  status: RouteStatus,
): Promise<{ ok: true } | { ok: false; problems: string[] }> {
  if (status === 'published') {
    const view = await findRouteById(id);
    if (!view) throw new AdminError('Route not found', 'NOT_FOUND');
    const problems = publishProblems(view);
    if (problems.length) return { ok: false, problems };
  }
  const [row] = await db()
    .update(s.routes)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === 'published' ? { publishedAt: new Date() } : {}),
      ...(status !== 'published' ? { isFeatured: false } : {}),
    })
    .where(eq(s.routes.id, id))
    .returning({ id: s.routes.id });
  if (!row) throw new AdminError('Route not found', 'NOT_FOUND');
  return { ok: true };
}

// ---------- days ----------

function dayValues(input: DayInput) {
  return {
    ...input,
    subtitle: input.subtitle ?? '',
    mapLegLabel: input.mapLegLabel ?? input.title,
    shortDescription: input.shortDescription ?? '',
  };
}

export async function addDay(routeId: number, input: DayInput): Promise<number> {
  return db().transaction(async (tx) => {
    const ids = await orderedDayIds(tx, routeId);
    const [route] = await tx
      .select({ id: s.routes.id })
      .from(s.routes)
      .where(eq(s.routes.id, routeId));
    if (!route) throw new AdminError('Route not found', 'NOT_FOUND');
    const [row] = await tx
      .insert(s.routeDays)
      .values({
        routeId,
        ...dayValues(input),
        dayNumber: ids.length + 1,
        displayOrder: ids.length + 1,
      })
      .returning({ id: s.routeDays.id });
    await touchRoute(tx, routeId);
    return row!.id;
  });
}

export async function updateDay(id: number, input: DayInput) {
  await db().transaction(async (tx) => {
    const routeId = await dayRoute(tx, id);
    await tx.update(s.routeDays).set(dayValues(input)).where(eq(s.routeDays.id, id));
    await touchRoute(tx, routeId);
  });
}

export async function deleteDay(id: number) {
  await db().transaction(async (tx) => {
    const routeId = await dayRoute(tx, id);
    await tx.delete(s.routeDays).where(eq(s.routeDays.id, id));
    await renumberDays(tx, routeId, await orderedDayIds(tx, routeId));
    await touchRoute(tx, routeId);
  });
}

export async function moveDay(id: number, direction: 'up' | 'down') {
  await db().transaction(async (tx) => {
    const routeId = await dayRoute(tx, id);
    const ids = await orderedDayIds(tx, routeId);
    const i = ids.indexOf(id);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    await renumberDays(tx, routeId, ids);
    await touchRoute(tx, routeId);
  });
}

// ---------- stops ----------

async function stopDay(tx: Tx, stopId: number) {
  const [row] = await tx
    .select({ dayId: s.routeDayStops.routeDayId, order: s.routeDayStops.displayOrder })
    .from(s.routeDayStops)
    .where(eq(s.routeDayStops.id, stopId));
  if (!row) throw new AdminError('Stop not found', 'NOT_FOUND');
  return row;
}

export async function addStop(dayId: number, input: StopInput): Promise<number> {
  return db().transaction(async (tx) => {
    const routeId = await dayRoute(tx, dayId);
    const [{ max } = { max: 0 }] = await tx
      .select({ max: sql<number>`coalesce(max(${s.routeDayStops.displayOrder}), 0)::int` })
      .from(s.routeDayStops)
      .where(eq(s.routeDayStops.routeDayId, dayId));
    const [row] = await tx
      .insert(s.routeDayStops)
      .values({ routeDayId: dayId, ...input, displayOrder: max + 1 })
      .returning({ id: s.routeDayStops.id });
    await touchRoute(tx, routeId);
    return row!.id;
  });
}

export async function updateStop(id: number, input: StopInput) {
  await db().transaction(async (tx) => {
    const { dayId } = await stopDay(tx, id);
    await tx.update(s.routeDayStops).set(input).where(eq(s.routeDayStops.id, id));
    await touchRoute(tx, await dayRoute(tx, dayId));
  });
}

export async function deleteStop(id: number) {
  await db().transaction(async (tx) => {
    const { dayId } = await stopDay(tx, id);
    await tx.delete(s.routeDayStops).where(eq(s.routeDayStops.id, id));
    await touchRoute(tx, await dayRoute(tx, dayId));
  });
}

export async function moveStop(id: number, direction: 'up' | 'down') {
  await db().transaction(async (tx) => {
    const { dayId, order } = await stopDay(tx, id);
    const [neighbour] = await tx
      .select({ id: s.routeDayStops.id, order: s.routeDayStops.displayOrder })
      .from(s.routeDayStops)
      .where(
        and(
          eq(s.routeDayStops.routeDayId, dayId),
          direction === 'up'
            ? lt(s.routeDayStops.displayOrder, order)
            : gt(s.routeDayStops.displayOrder, order),
        ),
      )
      .orderBy(
        direction === 'up' ? desc(s.routeDayStops.displayOrder) : asc(s.routeDayStops.displayOrder),
      )
      .limit(1);
    if (!neighbour) return;
    await tx
      .update(s.routeDayStops)
      .set({ displayOrder: neighbour.order })
      .where(eq(s.routeDayStops.id, id));
    await tx
      .update(s.routeDayStops)
      .set({ displayOrder: order })
      .where(eq(s.routeDayStops.id, neighbour.id));
    await touchRoute(tx, await dayRoute(tx, dayId));
  });
}

// ---------- places ----------

export async function listPlaces() {
  const [dest, attr] = await Promise.all([
    db().select().from(s.destinations).orderBy(asc(s.destinations.name)),
    db().select().from(s.attractions).orderBy(asc(s.attractions.name)),
  ]);
  return { destinations: dest, attractions: attr };
}

async function saveWithConflict<T>(fn: () => Promise<T>, slug: string) {
  try {
    return await fn();
  } catch (err) {
    if (isUniqueViolation(err))
      throw new AdminError(`The slug "${slug}" is already used`, 'CONFLICT');
    throw err;
  }
}

export async function saveDestination(input: {
  id: number | null;
  slug: string;
  name: string;
  region: string | null;
  shortDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  isMajorStop: boolean;
}) {
  const { id, ...values } = input;
  const row = { ...values, region: values.region ?? '' };
  return saveWithConflict(async () => {
    if (id) await db().update(s.destinations).set(row).where(eq(s.destinations.id, id));
    else await db().insert(s.destinations).values(row);
  }, input.slug);
}

export async function saveAttraction(input: {
  id: number | null;
  slug: string;
  name: string;
  destinationId: number | null;
  attractionType: string;
  shortDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  isOptional: boolean;
}) {
  const { id, ...values } = input;
  return saveWithConflict(async () => {
    if (id) await db().update(s.attractions).set(values).where(eq(s.attractions.id, id));
    else await db().insert(s.attractions).values(values);
  }, input.slug);
}

// ---------- media ----------

export async function listMedia() {
  return db().select().from(s.mediaAssets).orderBy(desc(s.mediaAssets.createdAt));
}

export async function listVehicles() {
  return db().select().from(s.vehicles).orderBy(asc(s.vehicles.name));
}

/** Stores an uploaded image as responsive variants under UPLOAD_DIR, served at /uploads/. */
export async function uploadMedia(input: {
  file: File;
  alt: string;
  credit: string | null;
  license: string | null;
}) {
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const stem = `${sanitizeStem(input.file.name)}-${randomBytes(4).toString('hex')}`;
  const result = await generateVariants(bytes, path.resolve(env().UPLOAD_DIR), stem);
  const [row] = await db()
    .insert(s.mediaAssets)
    .values({
      basePath: `/uploads/${stem}`,
      alt: input.alt,
      width: result.width,
      height: result.height,
      variantWidths: result.widths,
      formats: result.formats,
      fallbackFormat: result.fallbackFormat,
      credit: input.credit,
      license: input.license,
    })
    .returning({ id: s.mediaAssets.id });
  return row!.id;
}

export async function updateMedia(input: {
  id: number;
  alt: string;
  credit: string | null;
  license: string | null;
}) {
  const { id, ...values } = input;
  await db().update(s.mediaAssets).set(values).where(eq(s.mediaAssets.id, id));
}

export async function getDayForEdit(routeId: number, dayId: number) {
  return db().query.routeDays.findFirst({
    where: and(eq(s.routeDays.id, dayId), eq(s.routeDays.routeId, routeId)),
    with: {
      route: { columns: { name: true } },
      stops: { orderBy: [asc(s.routeDayStops.displayOrder), asc(s.routeDayStops.id)] },
    },
  });
}
