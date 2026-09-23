import type { APIRoute } from 'astro';
import { buildRobots } from '../lib/seo/sitemap';

export const prerender = true;

export const GET: APIRoute = ({ site, url }) =>
  new Response(buildRobots(site ?? url), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
