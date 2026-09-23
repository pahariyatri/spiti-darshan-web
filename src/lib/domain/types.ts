/** Rendering-facing shapes: components only ever see these. */

export const STOP_TYPES = [
  'start',
  'stop',
  'viewpoint',
  'monastery',
  'attraction',
  'bridge',
  'village',
  'lake',
  'pass',
  'detour',
  'activity',
  'overnight',
  'return',
] as const;
export type StopType = (typeof STOP_TYPES)[number];

export interface MediaView {
  /** Base public path without size/extension, e.g. `/media/hero-vehicles`. */
  basePath: string;
  alt: string;
  width: number;
  height: number;
  widths: number[];
  formats: string[];
  /** Fallback raster format available at every width (`jpg` or `webp`). */
  fallbackFormat: string;
}

export interface StopView {
  name: string;
  mapLabel: string | null;
  type: StopType;
  isOptional: boolean;
  isSeasonal: boolean;
  showOnMap: boolean;
  destinationSlug: string | null;
  attractionSlug: string | null;
}

export interface DayView {
  dayNumber: number;
  title: string;
  subtitle: string;
  mapLegLabel: string;
  shortDescription: string;
  note: string | null;
  isSeasonal: boolean;
  overnight: string | null;
  media: MediaView | null;
  /** SVG path segment in the route's map viewBox; null = the vehicle stays put that day. */
  mapSegment: string | null;
  stops: StopView[];
}

interface SeoFields {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
}

interface VehicleView {
  slug: string;
  name: string;
  vehicleType: string;
  media: MediaView | null;
}

/** A published route, ready to render. Built from src/content by src/lib/content/routes.ts. */
export interface RouteView {
  slug: string;
  name: string;
  shortTitle: string;
  summary: string;
  startingLocation: string;
  endingLocation: string;
  durationDays: number;
  seasonality: string;
  isFeatured: boolean;
  hero: {
    kicker: string;
    title: string;
    titleAccent: string;
    subtitle?: string | null;
    media: MediaView | null;
  };
  days: DayView[];
  vehicles: VehicleView[];
  seo: SeoFields;
}
