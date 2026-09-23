import { defineMiddleware } from 'astro:middleware';
import { sessionCookieName, validateSession } from './lib/auth/session';
import { applySecurityHeaders } from './lib/http/security-headers';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login/']);

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.admin = null;
  if (context.isPrerendered) return next();

  const { pathname } = context.url;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAction = pathname.startsWith('/_actions/');

  if (isAdmin || isAction) {
    const token = context.cookies.get(sessionCookieName())?.value;
    try {
      context.locals.admin = await validateSession(token);
    } catch (err) {
      console.error('[auth] session lookup failed', err instanceof Error ? err.message : err);
      context.locals.admin = null; // fail closed
    }
    if (isAdmin && !context.locals.admin && !PUBLIC_ADMIN_PATHS.has(pathname)) {
      const nextUrl = encodeURIComponent(pathname + context.url.search);
      return context.redirect(`/admin/login/?next=${nextUrl}`, 303);
    }
  }

  const response = await next();
  applySecurityHeaders(response.headers, { https: context.url.protocol === 'https:' });
  if (isAdmin || isAction) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
});
