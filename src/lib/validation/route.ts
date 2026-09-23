/** Admin input schemas. Shared by Astro Actions and unit tests. */
import { z } from 'astro/zod';
import { ROUTE_STATUSES, STOP_TYPES } from '../domain/types';

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes')
  .max(80);

const text = (max: number) => z.string().trim().min(1, 'Required').max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
// Plain `.nullable()` (no transform): Astro's form parser only coerces numbers when the
// optional/nullable wrapper sits directly on z.number(). Empty inputs arrive as null.
const optionalId = z.number().int().positive().nullable();

/** Canonical overrides must be site-relative paths — never another origin. */
const canonicalPath = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\/[a-z0-9\-/]*$/.test(v), 'Must be a path like /routes/my-route/');

/** SVG path data: commands and numbers only (it is rendered inside an attribute). */
const svgPath = z
  .string()
  .trim()
  .max(4000)
  .nullish()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v === null || /^[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]+$/.test(v),
    'Only SVG path commands and numbers',
  );

export const robotsSchema = z
  .enum(['', 'index,follow,max-image-preview:large', 'noindex,follow', 'noindex,nofollow'])
  .nullish()
  .transform((v) => (v ? v : null));

export const routeCreateSchema = z.object({
  slug: slugSchema,
  name: text(160),
  shortTitle: text(80),
  summary: text(600),
  startingLocation: text(80),
  endingLocation: text(80),
});

export const routeUpdateSchema = routeCreateSchema.extend({
  id: z.number().int().positive(),
  routeType: text(40),
  seasonality: optionalText(800),
  isFeatured: z.boolean(),
  heroKicker: optionalText(80),
  heroTitle: optionalText(120),
  heroTitleAccent: optionalText(120),
  heroMediaId: optionalId,
  vehicleIds: z.array(z.number().int().positive()).default([]),
  metaTitle: optionalText(70),
  metaDescription: optionalText(170),
  canonicalPath,
  ogTitle: optionalText(90),
  ogDescription: optionalText(200),
  ogImageId: optionalId,
  robots: robotsSchema,
});
export type RouteUpdateInput = z.infer<typeof routeUpdateSchema>;

export const routeStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(ROUTE_STATUSES),
});

export const dayInputSchema = z.object({
  title: text(120),
  subtitle: optionalText(80),
  mapLegLabel: optionalText(80),
  shortDescription: optionalText(300),
  dayNote: optionalText(400),
  isSeasonal: z.boolean(),
  overnightDestinationId: optionalId,
  mediaId: optionalId,
  mapSegment: svgPath,
});
export const dayCreateSchema = dayInputSchema.extend({ routeId: z.number().int().positive() });
export const dayUpdateSchema = dayInputSchema.extend({ id: z.number().int().positive() });
export type DayInput = z.infer<typeof dayInputSchema>;

export const moveSchema = z.object({
  id: z.number().int().positive(),
  direction: z.enum(['up', 'down']),
});
export const idSchema = z.object({ id: z.number().int().positive() });

export const stopInputSchema = z.object({
  stopName: text(80),
  mapLabel: optionalText(80),
  stopType: z.enum(STOP_TYPES),
  destinationId: optionalId,
  attractionId: optionalId,
  isOptional: z.boolean(),
  isSeasonal: z.boolean(),
  showOnMap: z.boolean(),
});
export const stopCreateSchema = stopInputSchema.extend({ dayId: z.number().int().positive() });
export const stopUpdateSchema = stopInputSchema.extend({ id: z.number().int().positive() });
export type StopInput = z.infer<typeof stopInputSchema>;

const coordinate = (min: number, max: number) => z.number().min(min).max(max).nullable();

export const destinationSchema = z.object({
  id: optionalId,
  slug: slugSchema,
  name: text(80),
  region: optionalText(80),
  shortDescription: optionalText(400),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  isMajorStop: z.boolean(),
});
export const attractionSchema = z.object({
  id: optionalId,
  slug: slugSchema,
  name: text(80),
  destinationId: optionalId,
  attractionType: text(40),
  shortDescription: optionalText(400),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  isOptional: z.boolean(),
});

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const mediaUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0 && f.size <= MAX_UPLOAD_BYTES, 'Image must be under 12 MB')
    .refine(
      (f) => ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(f.type),
      'JPEG, PNG, WebP or AVIF only',
    ),
  alt: text(200),
  credit: optionalText(120),
  license: optionalText(120),
});
export const mediaUpdateSchema = z.object({
  id: z.number().int().positive(),
  alt: text(200),
  credit: optionalText(120),
  license: optionalText(120),
});

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
  next: z.string().max(300).optional(),
});

/** Only same-site admin paths are valid post-login destinations (no open redirects). */
export function safeNext(next: string | undefined): string {
  return next && /^\/admin\/[\w\-/?=&%.]*$/.test(next) && !next.startsWith('//') ? next : '/admin/';
}
