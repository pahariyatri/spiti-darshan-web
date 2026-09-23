import type { APIRoute } from 'astro';
import { getPublishedRoutes } from '../lib/content/routes';
import { buildSitemap } from '../lib/seo/sitemap';

export const GET: APIRoute = ({ site, url }) => {
  const built = new Date();
  const routes = getPublishedRoutes().map((r) => ({ slug: r.slug, updatedAt: built }));
  return new Response(buildSitemap(site ?? url, routes), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
