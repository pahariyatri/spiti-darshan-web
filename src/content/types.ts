/**
 * Content model. Routes are plain typed data: adding a route means adding a file in
 * src/content/routes/ and registering it in src/content/routes/index.ts — never copying a page.
 * The build validates everything (src/lib/content/routes.ts) and fails on broken content.
 */
import type { StopType } from '../lib/domain/types';

export interface DestinationContent {
  slug: string;
  name: string;
  region: string;
  isMajorStop?: boolean;
}

export interface AttractionContent {
  slug: string;
  name: string;
  destination: string | null;
  type: string;
  isOptional?: boolean;
}

export interface StopContent {
  name: string;
  type: StopType;
  destination?: string;
  attraction?: string;
  mapLabel?: string;
  optional?: boolean;
  seasonal?: boolean;
  /** Defaults to true. Chips that are activities, not places, stay off the map. */
  showOnMap?: boolean;
}

export interface DayContent {
  dayNumber: number;
  subtitle: string;
  title: string;
  mapLegLabel: string;
  shortDescription: string;
  note: string | null;
  isSeasonal?: boolean;
  overnight: string | null;
  media: string | null;
  mapSegment: string | null;
  stops: StopContent[];
}

export interface RouteContent {
  slug: string;
  /** Only `published` routes are built. Drafts stay in the repo but produce no page. */
  status: 'published' | 'draft';
  name: string;
  shortTitle: string;
  summary: string;
  startingLocation: string;
  endingLocation: string;
  routeType: string;
  seasonality: string;
  isFeatured: boolean;
  hero: { kicker: string; title: string; titleAccent: string; media: string };
  seo: { metaTitle: string; metaDescription: string; ogTitle: string; ogDescription: string };
  vehicles: string[];
  days: DayContent[];
}

export interface VehicleContent {
  slug: string;
  name: string;
  vehicleType: string;
  /** Stem of an image in media-source/manifest.json */
  media: string | null;
}
