/**
 * Build-time content loader: typed route files → validated RouteView objects.
 * Every page reads routes through here, so broken content fails the build, not the visitor.
 */
import type { RouteView } from '../domain/types';
import { STOP_TYPES } from '../domain/types';
import { allStaticMedia, staticMedia, toMediaView } from '../media/static-media';
import { attractions, destinations, vehicles } from '../../content/places';
import { routeContent } from '../../content/routes';
import type { RouteContent } from '../../content/types';
import { publishProblems } from './publish';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const media = (stem: string | null) => (stem ? toMediaView(staticMedia(stem)) : null);
const destName = (slug: string | null) => destinations.find((d) => d.slug === slug)?.name ?? null;

export function toRouteView(route: RouteContent): RouteView {
  return {
    slug: route.slug,
    name: route.name,
    shortTitle: route.shortTitle,
    summary: route.summary,
    startingLocation: route.startingLocation,
    endingLocation: route.endingLocation,
    durationDays: route.days.length,
    seasonality: route.seasonality,
    isFeatured: route.isFeatured,
    hero: {
      kicker: route.hero.kicker,
      title: route.hero.title,
      titleAccent: route.hero.titleAccent,
      subtitle: route.hero.subtitle ?? null,
      media: media(route.hero.media),
    },
    days: route.days.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      subtitle: d.subtitle,
      mapLegLabel: d.mapLegLabel,
      shortDescription: d.shortDescription,
      note: d.note,
      isSeasonal: d.isSeasonal ?? false,
      overnight: destName(d.overnight),
      media: media(d.media),
      mapSegment: d.mapSegment,
      stops: d.stops.map((s) => ({
        name: s.name,
        mapLabel: s.mapLabel ?? null,
        type: s.type,
        isOptional: s.optional ?? false,
        isSeasonal: s.seasonal ?? false,
        showOnMap: s.showOnMap ?? true,
        destinationSlug: s.destination ?? null,
        attractionSlug: s.attraction ?? null,
      })),
    })),
    vehicles: vehicles
      .filter((v) => route.vehicles.includes(v.slug))
      .map((v) => ({
        slug: v.slug,
        name: v.name,
        vehicleType: v.vehicleType,
        media: media(v.media),
      })),
    seo: { ...route.seo },
  };
}

/** All problems in a set of route files (empty = valid). Pure, so tests can feed it bad content. */
export function contentProblems(routes: RouteContent[]): string[] {
  const problems: string[] = [];
  const mediaStems = new Set(allStaticMedia().map((m) => m.stem));
  const destSlugs = new Set(destinations.map((d) => d.slug));
  const attrSlugs = new Set(attractions.map((a) => a.slug));
  const vehicleSlugs = new Set(vehicles.map((v) => v.slug));
  const seen = new Set<string>();
  const published = routes.filter((r) => r.status === 'published');

  if (published.filter((r) => r.isFeatured).length !== 1) {
    problems.push(
      'Exactly one published route must have isFeatured: true (it powers the homepage).',
    );
  }
  for (const r of routes) {
    const at = `Route "${r.slug}"`;
    const before = problems.length;
    if (!SLUG.test(r.slug))
      problems.push(`${at}: slug must be lowercase words joined by single dashes.`);
    if (seen.has(r.slug)) problems.push(`${at}: duplicate slug.`);
    seen.add(r.slug);
    if (!mediaStems.has(r.hero.media))
      problems.push(`${at}: unknown hero image "${r.hero.media}".`);
    for (const v of r.vehicles)
      if (!vehicleSlugs.has(v)) problems.push(`${at}: unknown vehicle "${v}".`);
    for (const d of r.days) {
      const day = `${at} day ${d.dayNumber}`;
      if (d.media && !mediaStems.has(d.media)) problems.push(`${day}: unknown image "${d.media}".`);
      if (d.overnight && !destSlugs.has(d.overnight))
        problems.push(`${day}: unknown overnight destination "${d.overnight}".`);
      if (d.mapSegment && !/^[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]+$/.test(d.mapSegment)) {
        problems.push(`${day}: mapSegment may only contain SVG path commands and numbers.`);
      }
      for (const s of d.stops) {
        if (!STOP_TYPES.includes(s.type)) problems.push(`${day}: unknown stop type "${s.type}".`);
        if (s.destination && !destSlugs.has(s.destination))
          problems.push(`${day}: unknown destination "${s.destination}".`);
        if (s.attraction && !attrSlugs.has(s.attraction))
          problems.push(`${day}: unknown attraction "${s.attraction}".`);
      }
    }
    // Completeness rules need a renderable view, so only check them when references resolve.
    if (r.status === 'published' && problems.length === before) {
      for (const p of publishProblems(toRouteView(r))) problems.push(`${at}: ${p}`);
    }
  }
  return problems;
}

let cache: RouteView[] | undefined;

/** Published routes, featured first. Throws (failing the build) if any content is invalid. */
export function getPublishedRoutes(): RouteView[] {
  if (cache) return cache;
  const problems = contentProblems(routeContent);
  if (problems.length) throw new Error(`Invalid route content:\n- ${problems.join('\n- ')}`);
  cache = routeContent
    .filter((r) => r.status === 'published')
    .map(toRouteView)
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  return cache;
}

export function getRoute(slug: string): RouteView | undefined {
  return getPublishedRoutes().find((r) => r.slug === slug);
}

export function getFeaturedRoute(): RouteView {
  const route = getPublishedRoutes().find((r) => r.isFeatured);
  if (!route) throw new Error('No featured route');
  return route;
}
