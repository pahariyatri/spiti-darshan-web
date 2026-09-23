// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';

// .env never overrides variables already set by the host (Vercel, CI).
if (existsSync('.env')) process.loadEnvFile('.env');

// Canonical origin: explicit PUBLIC_SITE_URL, else Vercel's production domain, else local.
const site =
  process.env.PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  'http://localhost:4321';

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
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
    },
  },
});
