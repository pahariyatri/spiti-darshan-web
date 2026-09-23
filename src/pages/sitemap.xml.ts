import type { APIRoute } from 'astro';
import { listPublishedRoutes } from '../lib/repositories/routes';
import { buildSitemap } from '../lib/seo/sitemap';

export const prerender = false;

export const GET: APIRoute = async ({ site, url }) => {
  const routes = await listPublishedRoutes();
  return new Response(buildSitemap(site ?? url, routes), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
