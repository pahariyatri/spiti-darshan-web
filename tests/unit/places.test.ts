import { describe, expect, it } from 'vitest';
import { places, placeForStop } from '../../src/lib/content/places';
import { getPublishedRoutes } from '../../src/lib/content/routes';
import { buildSitemap } from '../../src/lib/seo/sitemap';

describe('place guides', () => {
  it('resolves every named destination and attraction in the published itinerary', () => {
    for (const route of getPublishedRoutes()) {
      for (const day of route.days) {
        for (const stop of day.stops) {
          if (stop.destinationSlug || stop.attractionSlug) {
            expect(placeForStop(stop), stop.name).toBeDefined();
          }
        }
      }
    }
  });
  it('gives an attraction its own page instead of its parent village', () => {
    expect(placeForStop({ attractionSlug: 'tabo-monastery', destinationSlug: 'tabo' })?.slug).toBe(
      'tabo-monastery',
    );
  });
  it('lists every guide in the sitemap with one unique URL', () => {
    const xml = buildSitemap('https://example.test', []);
    expect(new Set(places.map((p) => p.path)).size).toBe(places.length);
    for (const place of places) {
      expect(xml).toContain(`<loc>https://example.test${place.path}</loc>`);
      expect(place.body.length).toBeGreaterThanOrEqual(2);
    }
  });
});
