/** Pure publish rules — a route must be complete enough to be a real, useful page. */
import type { RouteView } from '../domain/types';

export function publishProblems(
  route: Pick<RouteView, 'days' | 'summary' | 'shortTitle' | 'hero'>,
): string[] {
  const problems: string[] = [];
  if (!route.summary.trim()) problems.push('Add a route summary.');
  if (route.days.length === 0) problems.push('Add at least one day.');
  if (!route.hero.media) problems.push('Choose a hero image.');
  route.days.forEach((d, i) => {
    if (d.dayNumber !== i + 1)
      problems.push(
        `Day numbers must run 1…${route.days.length} (found ${d.dayNumber} at position ${i + 1}).`,
      );
    if (d.stops.length === 0) problems.push(`Day ${d.dayNumber} has no stops.`);
    if (!d.title.trim()) problems.push(`Day ${d.dayNumber} needs a title.`);
  });
  return problems;
}
