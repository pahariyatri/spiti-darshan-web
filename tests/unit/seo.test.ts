import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  buildPageMeta,
  buildRouteMeta,
  clampDescription,
  formatTitle,
} from '../../src/lib/seo/meta';
import {
  breadcrumbSchema,
  graph,
  organizationSchema,
  serializeJsonLd,
  touristTripSchema,
} from '../../src/lib/seo/schema';
import { buildRobots, buildSitemap } from '../../src/lib/seo/sitemap';
import { toRouteView } from '../../src/lib/content/routes';
import { shimlaToSpiti } from '../../src/content/routes/shimla-to-spiti';

const SITE = 'https://example.test';
const route = toRouteView(shimlaToSpiti);

describe('page metadata', () => {
  it('builds absolute canonical URLs with trailing slashes', () => {
    expect(absoluteUrl('/routes/x', SITE)).toBe('https://example.test/routes/x/');
    expect(absoluteUrl('/sitemap.xml', SITE)).toBe('https://example.test/sitemap.xml');
    expect(absoluteUrl('/', SITE)).toBe('https://example.test/');
  });

  it('appends the brand once and keeps descriptions within limits', () => {
    expect(formatTitle('Contact')).toBe('Contact | Spiti Darshan');
    expect(formatTitle('About Spiti Darshan')).toBe('About Spiti Darshan');
    const long = 'word '.repeat(60);
    expect(clampDescription(long).length).toBeLessThanOrEqual(160);
    expect(clampDescription(long).endsWith('…')).toBe(true);
  });

  it('produces complete OG metadata', () => {
    const meta = buildPageMeta({ title: 'T', description: 'D', path: '/contact/', site: SITE });
    expect(meta.canonical).toBe('https://example.test/contact/');
    expect(meta.ogImage).toMatch(/^https:\/\/example\.test\/media\/.+-og\.jpg$/);
    expect(meta.robots).toContain('index');
  });

  it('uses the route SEO fields and canonical route path', () => {
    const meta = buildRouteMeta(route, SITE);
    expect(meta.title).toBe(
      'Shimla to Spiti Taxi: 9 Day Innova Crysta Circuit | Spiti Darshan',
    );
    expect(meta.canonical).toBe('https://example.test/routes/shimla-to-spiti/');
    expect(meta.robots).toContain('index');
  });
});

describe('structured data', () => {
  it('lists the verified WhatsApp number as the contact point', () => {
    expect(JSON.stringify(organizationSchema(SITE))).toContain('"telephone":"+916230070301"');
  });

  it('describes the trip with every day and no invented commercial facts', () => {
    const json = JSON.stringify(graph(touristTripSchema(route, SITE)));
    expect(json).toContain('"@type":"TouristTrip"');
    expect(json).toContain('Day 9: Chandratal → Manali');
    for (const banned of ['aggregateRating', 'review', 'offers', 'price', 'address']) {
      expect(json).not.toContain(banned);
    }
  });

  it('numbers breadcrumbs and escapes script-breaking characters', () => {
    const crumbs = breadcrumbSchema(
      [
        { name: 'Home', path: '/' },
        { name: 'R', path: '/routes/' },
      ],
      SITE,
    );
    expect((crumbs.itemListElement as { position: number }[]).map((i) => i.position)).toEqual([
      1, 2,
    ]);
    expect(serializeJsonLd({ x: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});

describe('robots and sitemap', () => {
  it('does not block Googlebot, Googlebot-Image or OAI-SearchBot and points to the sitemap', () => {
    const robots = buildRobots(SITE);
    expect(robots).toContain('User-agent: *\nAllow: /');
    expect(robots).not.toMatch(/User-agent: (Googlebot|OAI-SearchBot)/);
    expect(robots).not.toContain('Disallow');
    expect(robots).toContain('Sitemap: https://example.test/sitemap.xml');
  });

  it('lists static pages and published routes, not noindex pages', () => {
    const xml = buildSitemap(SITE, [
      { slug: 'shimla-to-spiti', updatedAt: new Date('2026-09-01T00:00:00Z') },
    ]);
    expect(xml).toContain(
      '<loc>https://example.test/routes/shimla-to-spiti/</loc><lastmod>2026-09-01</lastmod>',
    );
    expect(xml).toContain('<loc>https://example.test/</loc>');
    expect(xml).toContain('/about/');
  });
});
