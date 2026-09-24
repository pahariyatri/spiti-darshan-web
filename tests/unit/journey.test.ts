import { describe, expect, it } from 'vitest';
import {
  chipLabel,
  chipPinIndexes,
  isStationaryDay,
  joinSegments,
  legRanges,
  mapLabel,
  pinKindLabel,
  resolveSegments,
} from '../../src/lib/journey/geometry';
import { buildJourneyPayload } from '../../src/lib/journey/payload';
import { toRouteView } from '../../src/lib/content/routes';
import { shimlaToSpiti } from '../../src/content/routes/shimla-to-spiti';
import type { StopView } from '../../src/lib/domain/types';

// Verbatim from reference/original.html: the approved map pins, per day.
const ORIGINAL_ROUTE_DAYS = [
  {
    leg: 'Shimla → Sangla',
    stops: [
      ['Shimla', 'start'],
      ['Kufri', 'viewpoint'],
      ['Narkanda', 'stop'],
      ['Rampur', 'stop'],
      ['Karcham', 'stop'],
      ['Sangla', 'stay'],
    ],
  },
  {
    leg: 'Sangla → Kalpa',
    stops: [
      ['Sangla', 'start'],
      ['Rakcham', 'stop'],
      ['Chitkul', 'detour'],
      ['Reckong Peo', 'stop'],
      ['Kalpa', 'stay'],
    ],
  },
  {
    leg: 'Kalpa → Tabo',
    stops: [
      ['Kalpa', 'start'],
      ['Pooh', 'stop'],
      ['Nako', 'attraction'],
      ['Gue', 'attraction'],
      ['Tabo', 'stay'],
    ],
  },
  {
    leg: 'Tabo → Kaza',
    stops: [
      ['Tabo Monastery', 'monastery'],
      ['Dhankar', 'monastery'],
      ['Pin Valley', 'detour'],
      ['Kaza', 'stay'],
    ],
  },
  {
    leg: 'Key → Kibber → Chicham',
    stops: [
      ['Kaza', 'start'],
      ['Key Monastery', 'monastery'],
      ['Kibber', 'attraction'],
      ['Chicham Bridge', 'attraction'],
      ['Kaza · return', 'stay'],
    ],
  },
  {
    leg: 'Langza → Hikkim → Komic',
    stops: [
      ['Kaza', 'start'],
      ['Langza', 'attraction'],
      ['Hikkim', 'attraction'],
      ['Komic', 'attraction'],
      ['Kaza · return', 'stay'],
    ],
  },
  { leg: 'Kaza · flexible day', stops: [['Kaza · rest day', 'stay']] },
  {
    leg: 'Kaza → Chandratal',
    stops: [
      ['Kaza', 'start'],
      ['Losar', 'stop'],
      ['Kunzum Pass', 'pass'],
      ['Chandratal turn', 'stop'],
      ['Chandratal · seasonal', 'lake'],
    ],
  },
  {
    leg: 'Chandratal → Manali',
    stops: [
      ['Chandratal', 'start'],
      ['Batal', 'stop'],
      ['Gramphu', 'stop'],
      ['Atal Tunnel', 'attraction'],
      ['Manali', 'stay'],
    ],
  },
];
// The original's inline label rule.
const originalKindLabel = (k: string) =>
  k === 'stay'
    ? 'overnight'
    : k === 'start'
      ? 'depart'
      : k === 'detour'
        ? 'detour'
        : k === 'monastery'
          ? 'monastery'
          : k === 'lake'
            ? 'lake'
            : k === 'pass'
              ? 'pass'
              : 'stop';

const stop = (over: Partial<StopView> = {}): StopView => ({
  name: 'X',
  mapLabel: null,
  type: 'stop',
  isOptional: false,
  isSeasonal: false,
  showOnMap: true,
  destinationSlug: null,
  attractionSlug: null,
  ...over,
});

describe('seeded journey reproduces the approved map', () => {
  const payload = buildJourneyPayload(toRouteView(shimlaToSpiti));

  it('has the same legs, pins and pin labels as the original script', () => {
    expect(payload.days).toHaveLength(9);
    payload.days.forEach((day, i) => {
      const original = ORIGINAL_ROUTE_DAYS[i]!;
      expect(day.leg).toBe(original.leg);
      expect(day.pins.map((p) => p.label)).toEqual(original.stops.map(([name]) => name));
      expect(day.pins.map((p) => p.kind)).toEqual(original.stops.map(([, kind]) => kind));
      expect(day.pins.map((p) => p.kindLabel)).toEqual(
        original.stops.map(([, kind]) => originalKindLabel(kind!)),
      );
    });
  });

  it('keeps day 7 stationary and gives the 8 travel days one forward stretch each', () => {
    expect(payload.segments.filter(Boolean)).toHaveLength(8);
    expect(payload.segments[6]).toBeNull();
    expect(payload.days[6]!.restLabel).toBe('REST / KAZA');
  });

  it('never doubles back or overlaps, including both Kaza return days', () => {
    let previousX = 30;
    let previousY = 58;
    for (const segment of payload.segments) {
      if (!segment) continue;
      const coordinates = segment.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const [x, y, c1x, , c2x, , endX, endY] = coordinates;
      expect(x).toBe(previousX);
      expect(y).toBe(previousY);
      expect(c1x).toBeGreaterThan(x!);
      expect(c2x).toBeGreaterThan(c1x!);
      expect(endX).toBeGreaterThan(c2x!);
      previousX = endX!;
      previousY = endY!;
    }
    expect(previousX).toBe(3170);
  });

  it('maps days onto the same path ranges as the original legRanges table', () => {
    const lengths = payload.segments.map((s) => (s ? 1 : null)); // equal lengths are enough for index mapping
    const ranges = legRanges(lengths);
    const expected = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 6],
      [6, 7],
      [7, 8],
    ].map(([a, b]) => [a! / 8, b! / 8]);
    expect(ranges).toEqual(expected);
  });
});

describe('geometry helpers', () => {
  it('detects stationary days', () => {
    expect(isStationaryDay({ stops: [stop(), stop({ showOnMap: false })] })).toBe(true);
    expect(isStationaryDay({ stops: [stop(), stop()] })).toBe(false);
  });

  it('generates continuous segments for routes without hand-drawn geometry', () => {
    const day = {
      stops: [stop({ destinationSlug: 'a' }), stop({ destinationSlug: 'b' })],
      mapSegment: null,
    };
    const segs = resolveSegments([day, day, { stops: [stop()], mapSegment: null }, day]);
    expect(segs[2]).toBeNull();
    const ends = segs.filter(Boolean).map((s) => s!.split(' ').slice(-2).join(' '));
    const starts = segs.filter(Boolean).map((s) => s!.split(' ').slice(1, 3).join(' '));
    expect(starts[1]).toBe(ends[0]);
    expect(starts[2]).toBe(ends[1]);
    expect(ends[2]).toMatch(/^3170 /);
    expect(joinSegments(segs)).not.toContain('null');
  });

  it('points chips that are not on the map at the previous pin', () => {
    expect(
      chipPinIndexes([
        { showOnMap: true },
        { showOnMap: false },
        { showOnMap: false },
        { showOnMap: true },
      ]),
    ).toEqual([0, 0, 0, 1]);
  });

  it('labels side trips plainly and honours map-label overrides', () => {
    expect(chipLabel({ name: 'Chitkul' })).toBe('Chitkul');
    expect(mapLabel({ name: 'Kaza', mapLabel: 'Kaza · return' })).toBe('Kaza · return');
    expect(pinKindLabel('viewpoint')).toBe('stop');
  });
});
