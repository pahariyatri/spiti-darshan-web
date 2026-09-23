# Spiti Darshan — web

Private taxi and transport for Spiti Valley. The site's job is to get a visitor from search to a
**WhatsApp conversation**: a commercial route page, then an understanding of itinerary, vehicle and stops,
then WhatsApp, a quote and a booking.

Astro 7 · TypeScript (strict) · PostgreSQL 16 · Drizzle ORM · Astro Actions · Node adapter · Playwright.
The approved design is `reference/original.html`; this app renders the same page from data.

- [Architecture](#architecture)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Commands](#commands)
- [Admin setup](#admin-setup)
- [Managing routes](#managing-routes) (add a route, days, attractions, publish)
- [How WhatsApp redirects work](#how-whatsapp-redirects-work)
- [Analytics](#analytics)
- [SEO checklist](#seo-checklist)
- [Testing](#testing)
- [Deployment, migrations, backups](#deployment-migrations-backups)

Further reading: [MIGRATION_PLAN.md](MIGRATION_PLAN.md) · [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md) ·
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) ·
[docs/ASSETS.md](docs/ASSETS.md)

## Architecture

```
Browser ──► Caddy/nginx (TLS, compression, headers)
              │
              ▼
          Node (Astro standalone)
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ prerendered HTML: /, /about/, /contact/, /vehicles/innova-crysta/, 404   │
   │ SSR: /routes/, /routes/[slug]/, /sitemap.xml, /go/whatsapp/, /api/event/,│
   │      /admin/** (+ Actions), /uploads/*                                   │
   └──────────────────────────────────────────────────────────────────────────┘
              │ Drizzle (parameterised SQL)
              ▼
          PostgreSQL ── daily pg_dump ──► off-site copy
```

```
src/
  pages/            routes (thin: load data → layout)
  layouts/          BaseLayout · RouteLayout (the one route template) · PageLayout · AdminLayout
  components/       Hero, Header, Footer, FaqSection, RouteFacts, Picture
    journey/        JourneySection · JourneyMap · JourneyDay · JourneyStop · VehicleMarker
    conversion/     WhatsAppLink · ContactSection · MobileWhatsAppCTA
    vehicles/ seo/ admin/
  actions/          Astro Actions (admin mutations, login) — Zod-validated
  middleware.ts     session → locals.admin, /admin guard, security headers
  lib/
    domain/         RouteView & friends: the only shapes components see
    db/             schema, client, migrate, seed/ (the approved itinerary as typed data)
    repositories/   reads (rows → RouteView), lead intents
    services/       admin writes, publish rules, WhatsApp/lead logic
    journey/        geometry (pure), payload (server), client (browser)
    whatsapp/ seo/ auth/ http/ media/ validation/ analytics/ config/
  styles/           site.css (approved CSS, verbatim) · pages.css · fonts.css · admin.css
```

Rules the code follows: components never touch the database; pages call repositories/services; all input is
parsed by Zod in `lib/validation`; WhatsApp URLs are built in exactly one place (`lib/whatsapp/message.ts`).

## Local setup

Requirements: Node ≥ 22.12, pnpm 11, Docker (or a local PostgreSQL 16).

```bash
pnpm install
cp .env.example .env                 # then set SESSION_SECRET: openssl rand -base64 48
docker compose up -d                 # PostgreSQL on 127.0.0.1:5434 (dev only)
pnpm db:migrate                      # create tables from drizzle/*.sql
pnpm db:seed                         # the approved 9-day Shimla → Spiti → Manali route
pnpm admin:create you@example.com    # prompts for a password (min 12 chars)
pnpm dev                             # http://localhost:4321
```

`pnpm dev` doesn't apply the CSP (Astro limitation); use `pnpm build && pnpm start` to test it.

## Environment variables

| Variable                                                    | Required      | Purpose                                                                                                                                        |
| ----------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                              | yes           | PostgreSQL connection string                                                                                                                   |
| `PUBLIC_SITE_URL`                                           | yes           | Canonical origin, no trailing slash (canonical URLs, sitemap, OG)                                                                              |
| `SESSION_SECRET`                                            | yes (admin)   | ≥ 32 random characters; keys the session-token HMAC                                                                                            |
| `BUSINESS_WHATSAPP_NUMBER`                                  | before launch | Verified number, country code + digits. **Empty until verified**: CTAs then open WhatsApp's contact picker and the page shows a "Preview" note |
| `ADMIN_EMAIL`                                               | no            | Default for `pnpm admin:create`                                                                                                                |
| `UPLOAD_DIR`                                                | no            | Admin image uploads (default `./uploads`). Persistent and backed up                                                                            |
| `TRUST_PROXY`                                               | prod          | `true` behind Caddy/nginx so rate limits see real client IPs                                                                                   |
| `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_LOGIN_WINDOW_SECONDS`   | no            | Login throttling (5 per 900 s)                                                                                                                 |
| `RATE_LIMIT_EVENTS_MAX`, `RATE_LIMIT_EVENTS_WINDOW_SECONDS` | no            | Beacon throttling (60 per 60 s)                                                                                                                |
| `ROUTE_PAGE_CACHE_SECONDS`                                  | no            | Shared-cache lifetime for SSR route pages (300)                                                                                                |

Never commit `.env`. The repository is public.

## Commands

| Command                                                           | What it does                                                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                                        | Dev server                                                                                                 |
| `pnpm build`                                                      | Generate image variants, then a production build (**needs the database**: the homepage prerenders from it) |
| `pnpm start`                                                      | Run the build (`HOST`, `PORT` env)                                                                         |
| `pnpm check` / `pnpm lint` / `pnpm format`                        | Typecheck / ESLint / Prettier                                                                              |
| `pnpm db:generate`                                                | Create a SQL migration from `schema.ts` changes; review and commit it                                      |
| `pnpm db:migrate`                                                 | Apply pending migrations (idempotent)                                                                      |
| `pnpm db:seed`                                                    | Insert reference data and seed routes if missing (`--force` rebuilds seed routes; **dev only**)            |
| `pnpm db:studio`                                                  | Drizzle Studio                                                                                             |
| `pnpm admin:create <email>`                                       | Create an admin, or reset a password and sign out all sessions                                             |
| `pnpm images`                                                     | Regenerate `public/media/*` from `media-source/`                                                           |
| `pnpm test`                                                       | Unit + integration tests (integration resets the `*_test` database)                                        |
| `pnpm test:e2e`                                                   | Build and serve against the test DB, then run Playwright (desktop + mobile)                                |
| `pnpm visual:capture <url> <dir>` / `pnpm visual:compare <a> <b>` | Screenshots at 390, 430, 768, 1440, 1920 and pixel diffs                                                   |

## Admin setup

1. `pnpm admin:create owner@your-domain` on the server. The password is typed at a hidden prompt, never
   passed in the environment or shell history. The first user is `owner`; add `--role=editor` for staff.
2. Sign in at `/admin/login/`. Sessions last 12 hours. Five wrong passwords lock that email for 15 minutes.
3. To reset a password, run the same command again. This also signs out every session for that user.

## Managing routes

A route is **data**. The homepage, every `/routes/<slug>/` page and the admin preview all render through
`RouteLayout`, so a new route never means copying a page.

### Add a route (e.g. "Chandigarh to Spiti")

1. **Admin → New route**: name, short title (`Chandigarh → Kaza`), slug (`chandigarh-to-spiti`),
   start/end, summary. It's saved as a **draft** (not public).
2. On the route screen, **Route details & SEO**: hero kicker, hero title (two lines), hero image,
   vehicles, seasonality, SEO title and description, optional canonical path, social title and image.
3. **Add days** (below). Use **Preview** at any time; it renders the real template with `noindex`.
4. **Publish**. Publishing is refused with a clear list if the route has no days, a day has no stops, day
   numbers have gaps, or there's no hero image. The page is live immediately, and it's added to the sitemap
   and the `/routes/` index.

### Add itinerary days

On the route screen, **+ Add a day**: title (`Shimla → Sangla`), eyebrow (`The first climb`), one-line
hook, note (put seasonal or optional qualifiers and "Overnight: …" here), overnight destination, photo,
and **Seasonal day** if it depends on road access. Days are numbered automatically; ↑/↓ reorder them and
deleting renumbers the rest.

On the map, each day with two or more map stops gets a road segment. Leave "Map road segment" empty for an
automatic curve; days that end where they start (Kaza loops) are drawn as loops. A day with one map stop
(rest day) keeps the vehicle still and shows `REST / <PLACE>`.

### Add stops and attractions

Open a day and use **+ Add a stop**. Stops appear, in order, as tappable chips under the day.

- **Type**: `start`, `overnight`, `monastery`, `lake` and `pass` show those words on the map pin; `detour`
  shows "optional"; others show "stop".
- **Optional** adds "· optional" to the chip and pin (Gue, Chitkul, Pin Valley).
- **Seasonal** marks sections that depend on road access (Kunzum, Chandratal).
- **Show on map** off keeps a chip without a pin (e.g. "Local market" on a rest day).
- **Map label override** changes the pin text only (`Kaza · return`).
- Link a **Destination** or **Attraction** so places are reusable. Create them under **Places**; leave
  coordinates empty unless verified.

### Publish / unpublish

Route screen, top card: **Publish**, **Unpublish (draft)** or **Archive**. Unpublishing takes the page
down immediately (404) and removes it from the sitemap. Only one route can be the **homepage route**.
Because the homepage is prerendered, changes to that route reach `/` at the next deploy; they're live on
`/routes/<slug>/` straight away.

## How WhatsApp redirects work

Every CTA links to `/go/whatsapp/?route=<slug>&day=<n>&cta=<location>`, a real, crawl-safe link that works
without JavaScript.

1. The query is validated (`lib/validation/lead.ts`). Bad values are dropped, never an error.
2. The route label and day leg are looked up (60 s cache, 400 ms timeout).
3. The message is built in the agreed format:

   ```
   Hello Spiti Darshan,
   I am interested in a private Spiti taxi.

   I am interested in Day 5:
   Key → Kibber → Chicham

   Route: Shimla → Spiti → Manali
   Travel dates:
   Travellers:
   Pickup city:

   Please confirm route availability and price.
   ```

4. An anonymous `whatsapp_click` is logged without delaying the response (rate limited per client).
5. The response is `302 → https://wa.me/<BUSINESS_WHATSAPP_NUMBER>?text=…`.

If the database is down, step 2 falls back to the generic message and step 4 is skipped, but the redirect
still happens.

## Analytics

Recorded in `lead_intents`, all anonymous (no IP, no cookies, no identifiers): `whatsapp_click` (server
side, with CTA location and day), `route_view` and `route_day_interest` (small `sendBeacon` calls), each with
UTM tags and the referrer **host**. The admin dashboard shows 30-day totals, clicks by CTA and clicks by
source.

A click is **intent, not a booking**. The metrics that matter are:

| Metric                                                        | Where it comes from                                                                                                         |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Sessions                                                      | Add a privacy-friendly analytics tool (e.g. Plausible or self-hosted Umami) — not built in                                  |
| WhatsApp clicks                                               | `lead_intents`                                                                                                              |
| Qualified enquiries, quotes sent, confirmed bookings, revenue | WhatsApp Business labels or a simple sheet or CRM; record them where the conversation happens. Don't infer them from clicks |

## SEO checklist

Every public page gets these automatically: a unique `<title>` and meta description, an absolute canonical
with a trailing slash, `robots`, Open Graph and Twitter cards with a 1200×630 image, exactly one H1, JSON-LD
(`Organization`, `WebPage`, `TouristTrip` with every day, `BreadcrumbList`), crawlable internal links, and
descriptive alt text.

When adding or editing content:

- [ ] Slug is short and descriptive; never change a published slug without a redirect.
- [ ] SEO title ≤ 60 characters (the brand is appended) and description ≤ 160, both specific to this route.
- [ ] Days, stops and seasonal notes are real and **different** from other routes (no city-name-swapped pages).
- [ ] Hero and day photos show the actual places, with honest alt text.
- [ ] No invented prices, ratings, reviews, phone numbers, addresses or fleet sizes, in copy or schema.
- [ ] After publishing: check `/sitemap.xml`, view source for the canonical, and test in Google's Rich Results Test.

`robots.txt` allows all crawlers (Googlebot, Googlebot-Image and OAI-SearchBot included) and disallows only
`/admin/`, `/go/`, `/api/` and `/_actions/`. `/about/` is `noindex` until the owner supplies real "about"
content.

## Testing

- **Unit** (`tests/unit`): WhatsApp message and URL, journey geometry (the seeded map must equal the original
  script's pins, labels and leg ranges), SEO, JSON-LD, sitemap and robots, validation (open redirect,
  canonical injection, SVG injection), publish rules, rate limits, sessions, argon2id.
- **Integration** (`tests/integration`, needs PostgreSQL): drops and recreates the `*_test` database, runs
  migrations from empty and seeds, then checks that the seed reproduces the itinerary exactly, slug lookup,
  ordering, publish and unpublish, the single featured route, sessions, login throttling and lead intents.
- **E2E** (`tests/e2e`, Playwright, desktop 1440 + mobile 390): animation, active-day state and
  `aria-current`, chip taps, no document overflow, full itinerary in no-JS HTML, WhatsApp redirect,
  attribution, mobile sticky CTA, 404, sitemap and robots, reduced motion, admin protection.
- **Visual**: `tests/visual/*`. Journey states match the original within 0.00–0.03% at all five
  viewports (screenshots are not committed; regenerate them locally).

CI (`.github/workflows/ci.yml`) runs format, lint and typecheck, a migration-drift check, unit and
integration tests on PostgreSQL 16, a production build, and Playwright.

## Deployment, migrations, backups

- **Deploy**: VPS + Node + PostgreSQL + Caddy (or nginx) with systemd. Step-by-step in
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). `deploy/deploy.sh <tag>` builds a new release directory, takes a
  pre-deploy backup, migrates, builds, switches the symlink and restarts.
- **Migration procedure**: change `schema.ts` → `pnpm db:generate` → review the SQL → commit → deploy
  (runs `pnpm db:migrate`). Migrations are forward-only; write backwards-compatible changes (add, backfill,
  then remove in a later release). To roll back code, redeploy the previous tag; to roll back data, restore
  the pre-deploy dump.
- **Backups and restore**: daily `pg_dump` plus uploads archive, retention of 14 daily, 8 weekly and 12
  monthly, off-site copy via rclone, and a tested restore and verify procedure in
  [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md).

## Before launch — owner inputs still needed

- [ ] Verified WhatsApp Business number → `BUSINESS_WHATSAPP_NUMBER`
- [ ] Production domain → `PUBLIC_SITE_URL`, Caddyfile
- [ ] Higher-resolution originals of the two vehicle photos (current: 680×510 and 510×510)
- [ ] Replace stock day photos that show the wrong place, **especially day 9 (Kathmandu)** — see [docs/ASSETS.md](docs/ASSETS.md)
- [ ] "About" copy (then remove `noindex` in `src/pages/about.astro`)
- [ ] Vehicle seating/luggage facts, if you want them on the vehicle page
