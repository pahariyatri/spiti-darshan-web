import { describe, expect, it } from 'vitest';
import { beaconEventSchema, whatsappGoSchema } from '../../src/lib/validation/lead';
import {
  dayInputSchema,
  loginSchema,
  routeCreateSchema,
  routeUpdateSchema,
  safeNext,
  slugSchema,
} from '../../src/lib/validation/route';

describe('WhatsApp redirect params', () => {
  it('accepts valid params', () => {
    const p = whatsappGoSchema.parse({
      route: 'shimla-to-spiti',
      day: '5',
      cta: 'day-card',
      utm_source: 'google',
    });
    expect(p).toMatchObject({
      route: 'shimla-to-spiti',
      day: 5,
      cta: 'day-card',
      utm_source: 'google',
    });
  });

  it('degrades hostile or broken params instead of failing the redirect', () => {
    const p = whatsappGoSchema.parse({
      route: '../../etc',
      day: 'NaN',
      cta: '<script>',
      ref: 'https://x.test/?email=a@b',
    });
    expect(p).toEqual({ cta: 'page' });
  });

  it('strips odd characters from UTM values', () => {
    expect(
      whatsappGoSchema.parse({ cta: 'hero', utm_campaign: 'summer<script>' }).utm_campaign,
    ).toBe('summerscript');
  });
});

describe('beacon events', () => {
  it('only accepts known event types for a slug', () => {
    expect(
      beaconEventSchema.safeParse({ type: 'route_view', route: 'shimla-to-spiti' }).success,
    ).toBe(true);
    expect(
      beaconEventSchema.safeParse({ type: 'whatsapp_click', route: 'shimla-to-spiti' }).success,
    ).toBe(false);
    expect(beaconEventSchema.safeParse({ type: 'route_view', route: 'Bad Slug' }).success).toBe(
      false,
    );
  });
});

describe('admin input', () => {
  it('normalises and validates slugs', () => {
    expect(slugSchema.parse(' Chandigarh-To-Spiti ')).toBe('chandigarh-to-spiti');
    expect(slugSchema.safeParse('a--b').success).toBe(false);
    expect(slugSchema.safeParse('../x').success).toBe(false);
  });

  it('requires route essentials', () => {
    expect(
      routeCreateSchema.safeParse({
        slug: 'x',
        name: '',
        shortTitle: 'x',
        summary: 'x',
        startingLocation: 'x',
        endingLocation: 'x',
      }).success,
    ).toBe(false);
  });

  it('rejects canonical URLs pointing to another origin', () => {
    const base = {
      id: 1,
      slug: 'x',
      name: 'x',
      shortTitle: 'x',
      summary: 'x',
      startingLocation: 'x',
      endingLocation: 'x',
      routeType: 'circuit',
      isFeatured: false,
      heroMediaId: null,
      ogImageId: null,
    };
    expect(
      routeUpdateSchema.safeParse({ ...base, canonicalPath: 'https://evil.example/' }).success,
    ).toBe(false);
    expect(routeUpdateSchema.safeParse({ ...base, canonicalPath: '//evil.example/' }).success).toBe(
      false,
    );
    expect(routeUpdateSchema.parse({ ...base, canonicalPath: '/routes/x/' }).canonicalPath).toBe(
      '/routes/x/',
    );
    expect(routeUpdateSchema.parse({ ...base, canonicalPath: '' }).canonicalPath).toBeNull();
  });

  it('only allows SVG path data in map segments', () => {
    const day = { title: 'D', isSeasonal: false, overnightDestinationId: null, mediaId: null };
    expect(
      dayInputSchema.safeParse({ ...day, mapSegment: 'M 30 58 C 98 27 142 81 210 62' }).success,
    ).toBe(true);
    expect(
      dayInputSchema.safeParse({ ...day, mapSegment: '"/><script>alert(1)</script>' }).success,
    ).toBe(false);
  });

  it('blocks open redirects after login', () => {
    expect(safeNext('/admin/routes/1/')).toBe('/admin/routes/1/');
    expect(safeNext('https://evil.example/')).toBe('/admin/');
    expect(safeNext('//evil.example/admin/')).toBe('/admin/');
    expect(safeNext('/routes/x/')).toBe('/admin/');
    expect(safeNext(undefined)).toBe('/admin/');
  });

  it('validates login input', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });
});
