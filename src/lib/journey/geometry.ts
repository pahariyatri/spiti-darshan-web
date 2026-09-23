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

/** A loop day ends where it started (Kaza → Key → Kibber → Kaza). */
export function isLoopDay(day: Pick<DayView, 'stops'>): boolean {
  const pins = day.stops.filter((s) => s.showOnMap);
  if (pins.length < 3) return false;
  const first = pins[0]!;
  const last = pins[pins.length - 1]!;
  return (
    last.type === 'return' ||
    (first.destinationSlug !== null && first.destinationSlug === last.destinationSlug)
  );
}

function endPoint(segment: string): { x: number; y: number } {
  const nums = segment.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 2) return START;
  return { x: nums[nums.length - 2]!, y: nums[nums.length - 1]! };
}

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Resolve one segment (or null) per day. Hand-drawn segments are kept verbatim; missing
 * segments on moving days get a deterministic gentle curve (or a loop) so any new route
 * renders without a designer touching SVG.
 */
export function resolveSegments(days: Pick<DayView, 'stops' | 'mapSegment'>[]): (string | null)[] {
  const moving = days.map((d) => !isStationaryDay(d));
  const forwardCount = days.filter((d, i) => moving[i] && !isLoopDay(d)).length;
  const step = forwardCount > 0 ? (END_X - START.x) / forwardCount : 0;
  let cursor = { ...START };
  let forwardIndex = 0;

  return days.map((day, i) => {
    if (!moving[i]) return null;
    if (day.mapSegment) {
      cursor = endPoint(day.mapSegment);
      return day.mapSegment;
    }
    const { x, y } = cursor;
    if (isLoopDay(day)) {
      const w = Math.min(220, Math.max(120, step * 0.6));
      const up = forwardIndex % 2 === 0 ? -1 : 1;
      return `M ${r(x)} ${r(y)} C ${r(x + w * 0.2)} ${r(y + 38 * up)} ${r(x + w)} ${r(y + 44 * up)} ${r(x + w * 0.9)} ${r(y + 10 * up)} C ${r(x + w * 0.8)} ${r(y - 16 * up)} ${r(x + w * 0.3)} ${r(y - 20 * up)} ${r(x)} ${r(y)}`;
    }
    forwardIndex += 1;
    const nx = x + step;
    const ny = forwardIndex % 2 === 0 ? 58 : 48;
    const bend = forwardIndex % 2 === 0 ? 26 : -26;
    cursor = { x: nx, y: ny };
    return `M ${r(x)} ${r(y)} C ${r(x + step / 3)} ${r(y + bend)} ${r(x + (2 * step) / 3)} ${r(ny - bend)} ${r(nx)} ${r(ny)}`;
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
      return 'optional';
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

export function chipLabel(stop: { name: string; isOptional: boolean }): string {
  return stop.isOptional ? `${stop.name} · optional` : stop.name;
}

export function mapLabel(stop: {
  name: string;
  mapLabel: string | null;
  isOptional: boolean;
}): string {
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
