import { env } from '../config/env';

/** Public SSR pages: always revalidate in browsers, short shared cache at the proxy/CDN. */
export function publicPageCache(headers: Headers) {
  const ttl = env().ROUTE_PAGE_CACHE_SECONDS;
  headers.set(
    'Cache-Control',
    `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl * 10}`,
  );
}

export function noStore(headers: Headers) {
  headers.set('Cache-Control', 'no-store');
}
