# Deployment (Vercel)

The site is static HTML, CSS, a small script and images. Vercel builds it on every push and serves it from its
CDN. There is no server, database or backup job to run.

## One-time setup

1. The Vercel project `spiti-darshan-web` is connected to `pahariyatri/spiti-darshan-web`. `vercel.json`
   sets the framework (Astro), install and build commands, the `dist` output, trailing slashes, security
   headers and long caching for `/_astro`, `/fonts` and `/media`.
2. **Project → Settings → Environment Variables** (Production, and Preview if you like):
   - `BUSINESS_WHATSAPP_NUMBER`: the verified number (digits). Leave unset until verified.
   - `PUBLIC_SITE_URL`: `https://your-domain` once a custom domain is attached. Before that, the build uses
     Vercel's production domain automatically.
3. **Project → Settings → General → Node.js Version**: 22.x (matches `package.json` and `.nvmrc`).
4. **Domains**: add the custom domain. Vercel issues HTTPS certificates automatically.
5. Optional: **Deployment Protection**. Vercel protects preview _and_ the `*.vercel.app` production URLs
   by default (SSO); a custom domain is public. Turn protection off for production if you want the
   `vercel.app` URL public before you have a domain.

## Releasing

Push to `main`, and Vercel deploys production. Pull requests get preview URLs. GitHub Actions (CI) runs
format, lint, typecheck, unit tests, the build and Playwright on every push and PR.

Environment variable changes need a redeploy (**Deployments → ⋯ → Redeploy**), because values are baked in
at build time.

**Rollback**: Vercel → Deployments → pick the previous production deployment → **Promote to Production**.

## Build time

A cold build re-encodes the photos (about 3–4 minutes on Vercel's 2-core machines). Variants are cached by
content hash in `node_modules/.cache/spiti-media`, which Vercel keeps between builds, so later builds skip
this unless a photo changes.

## Backups

Everything (code, content, source photos) is in Git and on GitHub. There is nothing else to back up. Keep the
Vercel environment variable values in the owner's password manager.
