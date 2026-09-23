import { describe, expect, it } from 'vitest';
import {
  chipLabel,
  chipPinIndexes,
  isLoopDay,
  isStationaryDay,
  joinSegments,
  legRanges,
  mapLabel,
  pinKindLabel,
  resolveSegments,
} from '../../src/lib/journey/geometry';
import { buildJourneyPayload } from '../../src/lib/journey/payload';
import { seedRouteToView } from '../../src/lib/db/seed/to-view';
import { shimlaToSpiti } from '../../src/lib/db/seed/data';
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
      ['Chitkul · optional', 'detour'],
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
      ['Gue · optional', 'detour'],
      ['Tabo', 'stay'],
    ],
  },
  {
    leg: 'Tabo → Kaza',
    stops: [
      ['Tabo Monastery', 'monastery'],
      ['Dhankar', 'monastery'],
      ['Pin Valley · optional', 'detour'],
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
        ? 'optional'
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
  const payload = buildJourneyPayload(seedRouteToView(shimlaToSpiti));

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

  it('keeps day 7 stationary and uses the 8 hand-drawn segments for the other days', () => {
    expect(payload.segments.filter(Boolean)).toHaveLength(8);
    expect(payload.segments[6]).toBeNull();
    expect(payload.days[6]!.restLabel).toBe('REST / KAZA');
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
  it('detects stationary and loop days', () => {
    expect(isStationaryDay({ stops: [stop(), stop({ showOnMap: false })] })).toBe(true);
    expect(
      isLoopDay({
        stops: [stop({ destinationSlug: 'kaza' }), stop(), stop({ destinationSlug: 'kaza' })],
      }),
    ).toBe(true);
    expect(
      isLoopDay({
        stops: [stop({ destinationSlug: 'kaza' }), stop(), stop({ destinationSlug: 'tabo' })],
      }),
    ).toBe(false);
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

  it('labels optional stops and honours map-label overrides', () => {
    expect(chipLabel({ name: 'Gue', isOptional: true })).toBe('Gue · optional');
    expect(mapLabel({ name: 'Kaza', mapLabel: 'Kaza · return', isOptional: false })).toBe(
      'Kaza · return',
    );
    expect(pinKindLabel('viewpoint')).toBe('stop');
  });
});
