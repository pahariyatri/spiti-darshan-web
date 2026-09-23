/** Server-side: turn a route into the small JSON document the map script consumes. */
import type { RouteView } from '../domain/types';
import {
  joinSegments,
  mapLabel,
  pinKindAttr,
  pinKindLabel,
  resolveSegments,
  MAP_VIEWBOX,
} from './geometry';

interface JourneyPin {
  label: string;
  kind: string;
  kindLabel: string;
}

export interface JourneyPayload {
  viewBox: { width: number; height: number };
  segments: (string | null)[];
  days: { leg: string; pins: JourneyPin[]; restLabel: string }[];
}

export function buildJourneyPayload(route: Pick<RouteView, 'days'>): JourneyPayload {
  return {
    viewBox: { ...MAP_VIEWBOX },
    segments: resolveSegments(route.days),
    days: route.days.map((day) => {
      const onMap = day.stops.filter((s) => s.showOnMap);
      const pins = (onMap.length ? onMap : day.stops.slice(0, 1)).map((s) => ({
        label: mapLabel(s),
        kind: pinKindAttr(s.type),
        kindLabel: pinKindLabel(s.type),
      }));
      return {
        leg: day.mapLegLabel,
        pins,
        restLabel: `REST / ${(onMap[0] ?? day.stops[0])?.name.toUpperCase() ?? ''}`,
      };
    }),
  };
}

export function journeyPath(route: Pick<RouteView, 'days'>): string {
  return joinSegments(resolveSegments(route.days));
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
