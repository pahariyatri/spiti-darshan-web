// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { existsSync } from 'node:fs';

// .env never overrides variables already set by the process manager / CI.
if (existsSync('.env')) process.loadEnvFile('.env');
const site = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// Pages are prerendered by default; anything that must reflect the database immediately
// (route pages, admin, redirects, endpoints) opts out with `export const prerender = false`.
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321, host: true },
  build: { inlineStylesheets: 'never' },
  security: {
    checkOrigin: true,
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
      styleDirective: {
        resources: ["'self'", 'https://fonts.googleapis.com'],
      },
    },
  },
  vite: {
    ssr: { external: ['@node-rs/argon2', 'sharp'] },
  },
});
