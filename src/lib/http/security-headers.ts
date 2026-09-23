/**
 * Headers for server-rendered responses. Prerendered files are served by the Node adapter's
 * static handler / reverse proxy — deploy/ configs set the same headers there.
 * (Script/style CSP is emitted per page by Astro as a hash-based <meta>; frame-ancestors can
 * only be sent as a header, so it lives here.)
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export function applySecurityHeaders(headers: Headers, { https }: { https: boolean }) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!headers.has(k)) headers.set(k, v);
  if (https) headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
