import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLabelCache,
  recordBeaconEvent,
  resolveWhatsAppRedirect,
  type LeadDeps,
} from '../../src/lib/services/leads';

const labels = {
  id: 1,
  label: 'Shimla → Spiti → Manali',
  days: new Map([[5, 'Key → Kibber → Chicham']]),
};

function deps(over: Partial<LeadDeps> = {}): LeadDeps {
  return {
    findLabels: vi.fn(async () => labels),
    insert: vi.fn(async () => undefined),
    businessNumber: () => '911234567890',
    log: vi.fn(),
    ...over,
  };
}
const text = (url: string) => decodeURIComponent(url.split('text=')[1]!);

describe('WhatsApp redirect service', () => {
  beforeEach(() => clearLabelCache());

  it('builds a day-specific message and logs an anonymous click', async () => {
    const d = deps();
    const url = await resolveWhatsAppRedirect(
      {
        route: 'shimla-to-spiti',
        day: 5,
        cta: 'day-card',
        utm_source: 'google',
        ref: 'www.google.com',
      },
      { log: true },
      d,
    );
    expect(url.startsWith('https://wa.me/911234567890?text=')).toBe(true);
    expect(text(url)).toContain('Day 5:\nKey → Kibber → Chicham');
    expect(d.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'whatsapp_click',
        routeId: 1,
        dayNumber: 5,
        ctaLocation: 'day-card',
        utmSource: 'google',
        referrerHost: 'www.google.com',
      }),
    );
  });

  it('still redirects when the database is down', async () => {
    const d = deps({
      findLabels: vi.fn(async () => Promise.reject(new Error('ECONNREFUSED'))),
      insert: vi.fn(async () => Promise.reject(new Error('ECONNREFUSED'))),
    });
    const url = await resolveWhatsAppRedirect(
      { route: 'shimla-to-spiti', day: 5, cta: 'hero' },
      { log: true },
      d,
    );
    expect(url).toContain('https://wa.me/911234567890?text=');
    expect(text(url)).not.toContain('Route:');
    await new Promise((r) => setTimeout(r, 0));
    expect(d.log).toHaveBeenCalled();
  });

  it('does not wait on a slow database for long', async () => {
    const d = deps({ findLabels: () => new Promise(() => undefined) });
    const started = Date.now();
    await resolveWhatsAppRedirect({ route: 'shimla-to-spiti', cta: 'hero' }, { log: false }, d);
    expect(Date.now() - started).toBeLessThan(1500);
  });

  it('ignores a day that does not exist on the route', async () => {
    const d = deps();
    const url = await resolveWhatsAppRedirect(
      { route: 'shimla-to-spiti', day: 42, cta: 'day-card' },
      { log: true },
      d,
    );
    expect(text(url)).not.toContain('Day 42');
    expect(d.insert).toHaveBeenCalledWith(expect.objectContaining({ dayNumber: null }));
  });

  it('skips logging when rate limited', async () => {
    const d = deps();
    await resolveWhatsAppRedirect({ cta: 'header' }, { log: false }, d);
    expect(d.insert).not.toHaveBeenCalled();
  });
});

describe('beacon events', () => {
  beforeEach(() => clearLabelCache());

  it('records route views for known routes only', async () => {
    const d = deps({
      findLabels: vi.fn(async (slug: string) => (slug === 'shimla-to-spiti' ? labels : null)),
    });
    expect(await recordBeaconEvent({ type: 'route_view', route: 'shimla-to-spiti' }, d)).toBe(true);
    expect(await recordBeaconEvent({ type: 'route_view', route: 'unknown' }, d)).toBe(false);
    expect(d.insert).toHaveBeenCalledTimes(1);
  });
});
