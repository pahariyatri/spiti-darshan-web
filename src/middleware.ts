import { defineMiddleware } from 'astro:middleware';
import { sessionCookieName, validateSession } from './lib/auth/session';
import { applySecurityHeaders } from './lib/http/security-headers';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login/']);

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.admin = null;
  if (context.isPrerendered) return next();

  const { pathname } = context.url;
  const isPrivate =
    pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/_actions/');

  // Every response leaving this middleware — including early redirects — gets the same headers.
  const finish = (response: Response) => {
    applySecurityHeaders(response.headers, { https: context.url.protocol === 'https:' });
    if (isPrivate) {
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    return response;
  };

  if (isPrivate) {
    const token = context.cookies.get(sessionCookieName())?.value;
    try {
      context.locals.admin = await validateSession(token);
    } catch (err) {
      console.error('[auth] session lookup failed', err instanceof Error ? err.message : err);
      context.locals.admin = null; // fail closed
    }
    const needsLogin = pathname.startsWith('/admin') && !PUBLIC_ADMIN_PATHS.has(pathname);
    if (needsLogin && !context.locals.admin) {
      const nextUrl = encodeURIComponent(pathname + context.url.search);
      return finish(
        new Response(null, { status: 303, headers: { Location: `/admin/login/?next=${nextUrl}` } }),
      );
    }
  }

  return finish(await next());
});
