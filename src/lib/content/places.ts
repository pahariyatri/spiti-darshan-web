import { attractions, destinations } from '../../content/places';
import { placeGuides } from '../../content/place-guides';
import type { StopView } from '../domain/types';

export const placePath = (slug: string) => `/places/${slug}/`;

export const places = Object.entries(placeGuides).map(([slug, guide]) => {
  const place = [...destinations, ...attractions].find((item) => item.slug === slug);
  if (!place) throw new Error(`Unknown place guide: ${slug}`);
  const destination =
    destinations.find((item) => item.slug === slug) ??
    destinations.find(
      (item) => item.slug === attractions.find((a) => a.slug === slug)?.destination,
    );
  return {
    ...guide,
    slug,
    name: place.name,
    region: destination?.region ?? 'Himachal Pradesh',
    path: placePath(slug),
  };
});

export function placeForStop(stop: Pick<StopView, 'attractionSlug' | 'destinationSlug'>) {
  return (
    places.find((p) => p.slug === stop.attractionSlug) ??
    places.find((p) => p.slug === stop.destinationSlug)
  );
}
