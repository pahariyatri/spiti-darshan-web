import { SITE } from '../config/site';
import type { MediaView, RouteView } from '../domain/types';

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogType: 'website' | 'article';
}

export const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large';
export const NOINDEX = 'noindex,nofollow';

/** Absolute URL on the canonical origin with a trailing slash on page paths. */
export function absoluteUrl(pathOrUrl: string, site: string | URL): string {
  const url = new URL(pathOrUrl, site);
  if (!/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

export function ogImagePath(media: MediaView | null | undefined): string {
  return media ? `${media.basePath}-og.jpg` : SITE.defaultOgImage;
}

/** Appends the brand unless the title already carries it; keeps titles readable. */
export function formatTitle(title: string): string {
  return title.includes(SITE.name) ? title : `${title} | ${SITE.name}`;
}

export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

export interface BuildMetaInput {
  title: string;
  description: string;
  path: string;
  site: string | URL;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: MediaView | null;
  ogType?: PageMeta['ogType'];
}

export function buildPageMeta(input: BuildMetaInput): PageMeta {
  const title = formatTitle(input.title);
  const description = clampDescription(input.description);
  return {
    title,
    description,
    canonical: absoluteUrl(input.path, input.site),
    robots: input.robots || DEFAULT_ROBOTS,
    ogTitle: input.ogTitle || title,
    ogDescription: clampDescription(input.ogDescription || description, 200),
    ogImage: absoluteUrl(ogImagePath(input.ogImage), input.site),
    ogImageAlt:
      input.ogImage?.alt ??
      'Real white Innova Crysta vehicles travelling through the Spiti mountains',
    ogType: input.ogType ?? 'website',
  };
}

export function routePath(slug: string): string {
  return `/routes/${slug}/`;
}

/** Route page metadata: SEO fields win, otherwise derived from route content. */
export function buildRouteMeta(
  route: RouteView,
  site: string | URL,
  opts: { preview?: boolean } = {},
): PageMeta {
  const seo = route.seo;
  return buildPageMeta({
    title: seo?.metaTitle || `${route.name} — ${route.durationDays}-day private taxi`,
    description: seo?.metaDescription || route.summary,
    path: seo?.canonicalPath || routePath(route.slug),
    site,
    robots: opts.preview || route.status !== 'published' ? NOINDEX : seo?.robots,
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
    ogImage: seo?.ogImage ?? route.hero.media,
  });
}
