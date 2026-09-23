/** Rendering-facing shapes. Repositories map database rows into these; components only see these. */

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

export const ROUTE_STATUSES = ['draft', 'published', 'archived'] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

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

export interface SeoFields {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalPath: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: MediaView | null;
  robots: string | null;
}

export interface VehicleView {
  slug: string;
  name: string;
  vehicleType: string;
  media: MediaView | null;
}

export interface RouteView {
  id: number | null;
  slug: string;
  name: string;
  shortTitle: string;
  summary: string;
  startingLocation: string;
  endingLocation: string;
  durationDays: number;
  routeType: string;
  seasonality: string;
  status: RouteStatus;
  isFeatured: boolean;
  hero: {
    kicker: string;
    title: string;
    titleAccent: string;
    media: MediaView | null;
  };
  days: DayView[];
  vehicles: VehicleView[];
  seo: SeoFields | null;
  updatedAt: Date | null;
}

export interface RouteSummary {
  slug: string;
  name: string;
  shortTitle: string;
  summary: string;
  durationDays: number;
  startingLocation: string;
  endingLocation: string;
  updatedAt: Date;
}
