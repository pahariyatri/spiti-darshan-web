import { describe, expect, it } from 'vitest';
import { contentProblems, getFeaturedRoute, getPublishedRoutes, getRoute } from '../../src/lib/content/routes';
import { shimlaToSpiti } from '../../src/content/routes/shimla-to-spiti';
import type { RouteContent } from '../../src/content/types';

const draft = (over: Partial<RouteContent> = {}): RouteContent => ({
  ...shimlaToSpiti,
  slug: 'chandigarh-to-spiti',
  status: 'draft',
  isFeatured: false,
  ...over,
});

describe('route content', () => {
  it('ships valid content with exactly one featured route', () => {
    expect(contentProblems([shimlaToSpiti])).toEqual([]);
    expect(getFeaturedRoute().slug).toBe('shimla-to-spiti');
    expect(getRoute('shimla-to-spiti')?.days).toHaveLength(9);
    expect(getRoute('nope')).toBeUndefined();
  });

  it('keeps the approved itinerary, qualifiers included', () => {
    const route = getPublishedRoutes()[0]!;
    expect(route.days.map((d) => d.mapLegLabel)).toEqual([
      'Shimla → Sangla',
      'Sangla → Kalpa',
      'Kalpa → Tabo',
      'Tabo → Kaza',
      'Key → Kibber → Chicham',
      'Langza → Hikkim → Komic',
      'Kaza · flexible day',
      'Kaza → Chandratal',
      'Chandratal → Manali',
    ]);
    const stops = route.days.flatMap((d) => d.stops);
    expect(stops.filter((s) => s.isOptional).map((s) => s.name)).toEqual(['Chitkul', 'Gue', 'Pin Valley']);
    expect(route.days.filter((d) => d.isSeasonal).map((d) => d.dayNumber)).toEqual([8, 9]);
    expect(route.days[6]!.overnight).toBe('Kaza');
  });

  it('builds drafts into nothing but still validates them', () => {
    expect(contentProblems([shimlaToSpiti, draft()])).toEqual([]);
    expect(contentProblems([shimlaToSpiti, draft({ days: [] })])).toEqual([]); // drafts may be incomplete
  });

  it('rejects broken content', () => {
    const bad = draft({ status: 'published', hero: { ...shimlaToSpiti.hero, media: 'missing-photo' } });
    expect(contentProblems([shimlaToSpiti, bad]).join(' ')).toContain('unknown hero image "missing-photo"');
    expect(contentProblems([shimlaToSpiti, draft({ slug: 'Bad Slug' })]).join(' ')).toContain('slug must be');
    expect(contentProblems([shimlaToSpiti, { ...shimlaToSpiti }]).join(' ')).toMatch(/duplicate slug|Exactly one/);
    expect(contentProblems([{ ...shimlaToSpiti, isFeatured: false }])).toContain(
      'Exactly one published route must have isFeatured: true (it powers the homepage).',
    );
    const day = { ...shimlaToSpiti.days[0]!, mapSegment: '"/><script>alert(1)</script>' };
    expect(contentProblems([{ ...shimlaToSpiti, days: [day, ...shimlaToSpiti.days.slice(1)] }]).join(' ')).toContain(
      'mapSegment may only contain',
    );
    const typo = { ...shimlaToSpiti.days[0]!, stops: [{ name: 'X', type: 'stop' as const, destination: 'nowhere' }] };
    expect(contentProblems([{ ...shimlaToSpiti, days: [typo, ...shimlaToSpiti.days.slice(1)] }]).join(' ')).toContain(
      'unknown destination "nowhere"',
    );
  });
});
