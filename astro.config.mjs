// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';

// .env never overrides variables already set by the host (Vercel, CI).
if (existsSync('.env')) process.loadEnvFile('.env');

// Canonical origin: explicit PUBLIC_SITE_URL, else Vercel's production domain, else local.
const site =
  process.env.PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '') ||
  'http://localhost:4321';

// Optional GA4 (whatsapp_click events): only when an ID is configured does the CSP allow Google.
const ga4 = process.env.PUBLIC_GA4_ID;
const google = ga4
  ? ' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com'
  : '';

// Fully static site: every page is HTML generated at build time from src/content.
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  // CSS is small (~20 KB, ~5 KB gzipped): inlining removes the render-blocking request.
  build: { inlineStylesheets: 'always' },
  server: { port: 4321, host: true },
  security: {
    csp: {
      ...(ga4
        ? { scriptDirective: { resources: ["'self'", 'https://www.googletagmanager.com'] } }
        : {}),
      directives: [
        "default-src 'self'",
        `img-src 'self' data:${google}`,
        "font-src 'self'",
        `connect-src 'self'${google}`,
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
    },
  },
});
