/**
 * Pure geometry helpers for the schematic journey map. No DOM here — unit tested.
 *
 * The map is an SVG path in a fixed 3200×110 viewBox (stretched with preserveAspectRatio=none),
 * built by concatenating one segment per *moving* day. A day with fewer than two map stops is
 * stationary (e.g. a rest day in Kaza) and contributes no segment.
 */
import type { DayView } from '../domain/types';

export const MAP_VIEWBOX = { width: 3200, height: 110 } as const;
const START = { x: 30, y: 58 };
const END_X = 3170;

export function isStationaryDay(day: Pick<DayView, 'stops'>): boolean {
  return day.stops.filter((s) => s.showOnMap).length < 2;
}

function endPoint(segment: string): { x: number; y: number } {
  const nums = segment.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 2) return START;
  return { x: nums[nums.length - 2]!, y: nums[nums.length - 1]! };
}

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Resolve one segment (or null) per day. The map reads as a single left-to-right road: every
 * travel day gets its own forward stretch of a gentle wave (a "Kaza → Key → Kibber → Kaza" loop
 * day is drawn forward too, so nothing overlaps); stationary days stay put. A hand-drawn
 * `mapSegment` is still honoured when a route provides one.
 */
export function resolveSegments(days: Pick<DayView, 'stops' | 'mapSegment'>[]): (string | null)[] {
  const moving = days.map((d) => !isStationaryDay(d));
  const count = moving.filter(Boolean).length;
  const step = count > 0 ? (END_X - START.x) / count : 0;
  let cursor = { ...START };
  let n = 0;

  return days.map((day, i) => {
    if (!moving[i]) return null;
    if (day.mapSegment) {
      cursor = endPoint(day.mapSegment);
      return day.mapSegment;
    }
    n += 1;
    const { x, y } = cursor;
    const nx = x + step;
    const ny = n % 2 === 0 ? 60 : 50;
    const bend = n % 2 === 0 ? 16 : -16;
    cursor = { x: nx, y: ny };
    return `M ${r(x)} ${r(y)} C ${r(x + step * 0.4)} ${r(y + bend)} ${r(x + step * 0.6)} ${r(ny - bend)} ${r(nx)} ${r(ny)}`;
  });
}

/** The single measuring/drawing path: segments joined (zero-length moves between them). */
export function joinSegments(segments: (string | null)[]): string {
  return segments.filter((s): s is string => Boolean(s)).join(' ');
}

/**
 * Day → [start, end] fractions of the whole path, from per-segment lengths.
 * Stationary days get a zero-length range at the current position.
 */
export function legRanges(segmentLengths: (number | null)[]): [number, number][] {
  const total = segmentLengths.reduce<number>((a, n) => a + (n ?? 0), 0) || 1;
  let acc = 0;
  return segmentLengths.map((len) => {
    const start = acc;
    acc += len ?? 0;
    return [start / total, acc / total];
  });
}

/** Text under a pin label. Kept identical to the approved page (attractions read "stop"). */
export function pinKindLabel(type: string): string {
  switch (type) {
    case 'overnight':
      return 'overnight';
    case 'start':
      return 'depart';
    case 'detour':
      return 'detour';
    case 'monastery':
    case 'lake':
    case 'pass':
      return type;
    default:
      return 'stop';
  }
}

/** CSS `data-kind` for a pin (the stylesheet styles `stay` and `detour`). */
export function pinKindAttr(type: string): string {
  return type === 'overnight' ? 'stay' : type;
}

export function chipLabel(stop: { name: string }): string {
  return stop.name;
}

export function mapLabel(stop: { name: string; mapLabel: string | null }): string {
  return stop.mapLabel ?? chipLabel(stop);
}

/**
 * For each chip (every stop), the index of the map pin it drives: its own pin if shown on the
 * map, otherwise the nearest preceding pin (a rest day's "Local market" chip → the Kaza pin).
 */
export function chipPinIndexes(stops: { showOnMap: boolean }[]): number[] {
  let pin = -1;
  return stops.map((s) => {
    if (s.showOnMap) pin += 1;
    return Math.max(0, pin);
  });
}
