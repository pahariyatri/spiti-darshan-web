import { describe, expect, it } from 'vitest';
import { publishProblems } from '../../src/lib/content/publish';
import { toRouteView } from '../../src/lib/content/routes';
import { shimlaToSpiti } from '../../src/content/routes/shimla-to-spiti';

const route = toRouteView(shimlaToSpiti);

describe('publish rules', () => {
  it('accepts the complete seeded route', () => {
    expect(publishProblems(route)).toEqual([]);
  });

  it('rejects empty routes, missing hero image, empty days and gaps in day numbers', () => {
    expect(publishProblems({ ...route, days: [] })).toContain('Add at least one day.');
    expect(publishProblems({ ...route, hero: { ...route.hero, media: null } })).toContain(
      'Choose a hero image.',
    );
    const days = route.days.map((d, i) => (i === 1 ? { ...d, stops: [] } : d));
    expect(publishProblems({ ...route, days })).toContain('Day 2 has no stops.');
    const gap = route.days.map((d, i) => (i === 2 ? { ...d, dayNumber: 7 } : d));
    expect(publishProblems({ ...route, days: gap }).join(' ')).toMatch(/Day numbers must run/);
  });
});
