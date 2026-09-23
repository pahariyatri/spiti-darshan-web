/**
 * PostgreSQL schema (Drizzle). Normalised: a route owns ordered days, a day owns ordered stops,
 * and stops optionally reference reusable destinations/attractions. No itinerary JSON blobs.
 * Changes go through `pnpm db:generate` → reviewed SQL in /drizzle → `pnpm db:migrate`.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { ROUTE_STATUSES, STOP_TYPES } from '../domain/types';
import { EVENT_TYPES } from '../validation/lead';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const routeStatus = pgEnum('route_status', ROUTE_STATUSES);
export const stopType = pgEnum('stop_type', STOP_TYPES);
export const leadEventType = pgEnum('lead_event_type', EVENT_TYPES);
export const adminRole = pgEnum('admin_role', ['owner', 'editor']);

export const businessSettings = pgTable('business_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamps.updatedAt,
});

export const mediaAssets = pgTable('media_assets', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  /** Base public path without width/extension, e.g. /media/hero-vehicles or /uploads/x. */
  basePath: text('base_path').notNull().unique(),
  alt: text('alt').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  variantWidths: integer('variant_widths').array().notNull(),
  formats: text('formats').array().notNull(),
  fallbackFormat: text('fallback_format').notNull().default('webp'),
  credit: text('credit'),
  license: text('license'),
  sourceUrl: text('source_url'),
  note: text('note'),
  createdAt: timestamps.createdAt,
});

export const routes = pgTable(
  'routes',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    shortTitle: text('short_title').notNull(),
    summary: text('summary').notNull(),
    startingLocation: text('starting_location').notNull(),
    endingLocation: text('ending_location').notNull(),
    durationDays: integer('duration_days').notNull(),
    routeType: text('route_type').notNull().default('one-way'),
    seasonality: text('seasonality').notNull().default(''),
    status: routeStatus('status').notNull().default('draft'),
    isFeatured: boolean('is_featured').notNull().default(false),
    heroKicker: text('hero_kicker').notNull().default(''),
    heroTitle: text('hero_title').notNull().default(''),
    heroTitleAccent: text('hero_title_accent').notNull().default(''),
    heroMediaId: integer('hero_media_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('routes_slug_key').on(t.slug),
    index('routes_status_idx').on(t.status),
    // At most one featured route (it powers the homepage).
    uniqueIndex('routes_single_featured_key')
      .on(t.isFeatured)
      .where(sql`${t.isFeatured}`),
    check('routes_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('routes_duration_positive', sql`${t.durationDays} between 1 and 60`),
  ],
);

export const destinations = pgTable(
  'destinations',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    region: text('region').notNull().default(''),
    shortDescription: text('short_description'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isMajorStop: boolean('is_major_stop').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('destinations_slug_key').on(t.slug),
    check('destinations_lat', sql`${t.latitude} is null or ${t.latitude} between -90 and 90`),
    check('destinations_lng', sql`${t.longitude} is null or ${t.longitude} between -180 and 180`),
  ],
);

export const attractions = pgTable(
  'attractions',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    destinationId: integer('destination_id').references(() => destinations.id, {
      onDelete: 'set null',
    }),
    attractionType: text('attraction_type').notNull().default('attraction'),
    shortDescription: text('short_description'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isOptional: boolean('is_optional').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('attractions_slug_key').on(t.slug),
    index('attractions_destination_idx').on(t.destinationId),
  ],
);

export const routeDays = pgTable(
  'route_days',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    routeId: integer('route_id')
      .notNull()
      .references(() => routes.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle').notNull().default(''),
    mapLegLabel: text('map_leg_label').notNull(),
    shortDescription: text('short_description').notNull().default(''),
    dayNote: text('day_note'),
    isSeasonal: boolean('is_seasonal').notNull().default(false),
    overnightDestinationId: integer('overnight_destination_id').references(() => destinations.id, {
      onDelete: 'set null',
    }),
    mediaId: integer('media_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    /** SVG path segment for the schematic map; null = stationary day or auto-generated. */
    mapSegment: text('map_segment'),
    displayOrder: integer('display_order').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('route_days_route_day_key').on(t.routeId, t.dayNumber),
    index('route_days_route_order_idx').on(t.routeId, t.displayOrder),
    check('route_days_day_positive', sql`${t.dayNumber} >= 1`),
  ],
);

export const routeDayStops = pgTable(
  'route_day_stops',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    routeDayId: integer('route_day_id')
      .notNull()
      .references(() => routeDays.id, { onDelete: 'cascade' }),
    destinationId: integer('destination_id').references(() => destinations.id, {
      onDelete: 'set null',
    }),
    attractionId: integer('attraction_id').references(() => attractions.id, {
      onDelete: 'set null',
    }),
    stopName: text('stop_name').notNull(),
    /** Optional different wording on the map pin (e.g. "Kaza · return"). */
    mapLabel: text('map_label'),
    stopType: stopType('stop_type').notNull().default('stop'),
    displayOrder: integer('display_order').notNull(),
    isOptional: boolean('is_optional').notNull().default(false),
    isSeasonal: boolean('is_seasonal').notNull().default(false),
    showOnMap: boolean('show_on_map').notNull().default(true),
    /** Reserved for manual pin placement along the day's leg (0–1); null = evenly spaced. */
    mapProgressPosition: doublePrecision('map_progress_position'),
    ...timestamps,
  },
  (t) => [
    index('route_day_stops_day_order_idx').on(t.routeDayId, t.displayOrder),
    index('route_day_stops_destination_idx').on(t.destinationId),
    index('route_day_stops_attraction_idx').on(t.attractionId),
    check(
      'route_day_stops_progress_range',
      sql`${t.mapProgressPosition} is null or ${t.mapProgressPosition} between 0 and 1`,
    ),
  ],
);

export const vehicles = pgTable('vehicles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  vehicleType: text('vehicle_type').notNull(),
  /** Unknown until the business confirms it — never guessed. */
  passengerCapacity: integer('passenger_capacity'),
  luggageNote: text('luggage_note'),
  mediaId: integer('media_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
  active: boolean('active').notNull().default(true),
  ...timestamps,
});

export const routeVehicleTypes = pgTable(
  'route_vehicle_types',
  {
    routeId: integer('route_id')
      .notNull()
      .references(() => routes.id, { onDelete: 'cascade' }),
    vehicleId: integer('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.routeId, t.vehicleId] })],
);

export const seoMetadata = pgTable(
  'seo_metadata',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    entityType: text('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    canonicalPath: text('canonical_path'),
    ogTitle: text('og_title'),
    ogDescription: text('og_description'),
    ogImageId: integer('og_image_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    robots: text('robots'),
    schemaOverride: jsonb('schema_override'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('seo_metadata_entity_key').on(t.entityType, t.entityId),
    check('seo_canonical_is_path', sql`${t.canonicalPath} is null or ${t.canonicalPath} ~ '^/'`),
  ],
);

/** Anonymous conversion intents. No IP, no names, no phone numbers. */
export const leadIntents = pgTable(
  'lead_intents',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    eventType: leadEventType('event_type').notNull(),
    routeId: integer('route_id').references(() => routes.id, { onDelete: 'set null' }),
    dayNumber: integer('day_number'),
    ctaLocation: text('cta_location'),
    referrerHost: text('referrer_host'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmTerm: text('utm_term'),
    utmContent: text('utm_content'),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index('lead_intents_created_at_idx').on(t.createdAt),
    index('lead_intents_route_idx').on(t.routeId, t.createdAt),
  ],
);

export const adminUsers = pgTable('admin_users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: adminRole('role').notNull().default('editor'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
});

export const adminSessions = pgTable(
  'admin_sessions',
  {
    /** HMAC-SHA256 of the cookie token — the raw token is never stored. */
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index('admin_sessions_user_idx').on(t.userId),
    index('admin_sessions_expires_idx').on(t.expiresAt),
  ],
);

// ---- relations (for typed relational queries) ----

export const routesRelations = relations(routes, ({ many, one }) => ({
  days: many(routeDays),
  vehicles: many(routeVehicleTypes),
  heroMedia: one(mediaAssets, { fields: [routes.heroMediaId], references: [mediaAssets.id] }),
}));

export const routeDaysRelations = relations(routeDays, ({ one, many }) => ({
  route: one(routes, { fields: [routeDays.routeId], references: [routes.id] }),
  stops: many(routeDayStops),
  overnight: one(destinations, {
    fields: [routeDays.overnightDestinationId],
    references: [destinations.id],
  }),
  media: one(mediaAssets, { fields: [routeDays.mediaId], references: [mediaAssets.id] }),
}));

export const routeDayStopsRelations = relations(routeDayStops, ({ one }) => ({
  day: one(routeDays, { fields: [routeDayStops.routeDayId], references: [routeDays.id] }),
  destination: one(destinations, {
    fields: [routeDayStops.destinationId],
    references: [destinations.id],
  }),
  attraction: one(attractions, {
    fields: [routeDayStops.attractionId],
    references: [attractions.id],
  }),
}));

export const attractionsRelations = relations(attractions, ({ one }) => ({
  destination: one(destinations, {
    fields: [attractions.destinationId],
    references: [destinations.id],
  }),
}));

export const routeVehicleTypesRelations = relations(routeVehicleTypes, ({ one }) => ({
  route: one(routes, { fields: [routeVehicleTypes.routeId], references: [routes.id] }),
  vehicle: one(vehicles, { fields: [routeVehicleTypes.vehicleId], references: [vehicles.id] }),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  media: one(mediaAssets, { fields: [vehicles.mediaId], references: [mediaAssets.id] }),
}));

export const seoMetadataRelations = relations(seoMetadata, ({ one }) => ({
  ogImage: one(mediaAssets, { fields: [seoMetadata.ogImageId], references: [mediaAssets.id] }),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  user: one(adminUsers, { fields: [adminSessions.userId], references: [adminUsers.id] }),
}));
