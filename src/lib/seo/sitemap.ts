import { absoluteUrl, routePath } from './meta';
import { places } from '../content/places';

const STATIC_INDEXABLE_PATHS = [
  '/',
  '/routes/',
  '/places/',
  '/vehicles/innova-crysta/',
  '/spiti-road-guide/',
  '/contact/',
] as const;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildSitemap(
  site: string | URL,
  routes: { slug: string; updatedAt: Date }[],
): string {
  const urls = [
    ...places.map((p) => ({ loc: absoluteUrl(p.path, site), lastmod: null })),
    ...STATIC_INDEXABLE_PATHS.map((p) => ({
      loc: absoluteUrl(p, site),
      lastmod: null as string | null,
    })),
    ...routes.map((r) => ({
      loc: absoluteUrl(routePath(r.slug), site),
      lastmod: r.updatedAt.toISOString().slice(0, 10),
    })),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildRobots(site: string | URL): string {
  // Search and AI-search crawlers (Googlebot, Googlebot-Image, OAI-SearchBot…) are all welcome.
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml', site)}`,
    '',
  ].join('\n');
}
