# Spiti Darshan — web

Private taxi and transport for Spiti Valley. The site's job is to get a visitor from search to a
**WhatsApp conversation**: a commercial route page, then an understanding of itinerary, vehicle and stops,
then WhatsApp, a quote and a booking.

A **fully static** Astro 7 site in TypeScript, hosted on Vercel. There is no database and no server: every
page is HTML generated at build time from typed content files. The approved design is
`reference/original.html`, and this site renders the same page from data.

Further reading: [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md) · [MIGRATION_PLAN.md](MIGRATION_PLAN.md) ·
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/ASSETS.md](docs/ASSETS.md)

> The earlier PostgreSQL + admin-panel version is preserved at git tag `v0.1-postgres-admin`.

## Local setup

Requirements: Node 22, pnpm 11.

```bash
pnpm install
cp .env.example .env     # optional locally
pnpm dev                 # http://localhost:4321
pnpm build && pnpm preview   # production build on http://127.0.0.1:4400
```

## Environment variables (build time)

| Variable                   | Purpose                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUSINESS_WHATSAPP_NUMBER` | Verified number, country code + digits. **Leave empty until verified**: CTAs then open WhatsApp's contact picker with the message, and the page shows a "Preview" note. |
| `PUBLIC_SITE_URL`          | Canonical origin (canonical URLs, sitemap, social cards). On Vercel it defaults to the project's production domain. Set it once you have a custom domain.               |

After changing a variable on Vercel, redeploy, because values are baked in at build time.

## How it fits together

```
src/content/            ← the only place you edit routes
  places.ts             destinations, attractions, vehicles (shared, referenced by slug)
  routes/<slug>.ts      one file per route: metadata, hero, SEO, days → stops
  routes/index.ts       list of routes to build
src/lib/content/        loads + validates content at build time (broken content fails the build)
src/layouts/RouteLayout.astro   the one template used by the homepage and every /routes/<slug>/
src/components/         Hero, journey/ (map, days, stops, Innova marker), conversion/ (WhatsApp CTAs)…
src/lib/journey/        map geometry (pure) + the browser script that animates the map
src/lib/whatsapp/       the one place WhatsApp messages/URLs are built
src/lib/seo/            meta tags, JSON-LD, sitemap, robots
src/styles/site.css     the approved stylesheet, verbatim
media-source/           original photos + manifest (alt text, credit, licence)
```

Pages: `/`, `/routes/`, `/routes/<slug>/` (one per published route), `/vehicles/innova-crysta/`,
`/contact/`, `/about/` (noindex until the owner writes it), `/404`, `/sitemap.xml`, `/robots.txt`.

## Adding a route (e.g. "Chandigarh to Spiti")

A new route is **a content file**, never a copied page.

1. Copy `src/content/routes/shimla-to-spiti.ts` to `src/content/routes/chandigarh-to-spiti.ts`, rename the
   export, and set `slug`, `status: 'draft'`, `isFeatured: false`, then edit the fields.
2. Register it in `src/content/routes/index.ts`.
3. Write the days (below), run `pnpm dev`, then set `status: 'published'`.
4. Commit and push. Vercel builds `/routes/chandigarh-to-spiti/` and adds it to `/routes/` and the sitemap.

The build **fails with a clear list** if a published route has no days, a day without stops, gaps in day
numbers, an unknown place or photo slug, or if there isn't exactly one featured (homepage) route.

### Days

```ts
{
  dayNumber: 1,                       // 1…n with no gaps
  subtitle: 'The first climb',        // eyebrow: "Day 01 · The first climb"
  title: 'Shimla → Sangla',           // day heading
  mapLegLabel: 'Shimla → Sangla',     // shown in the sticky map bar
  shortDescription: 'Pine forests give way to the Baspa Valley.',
  note: 'Overnight: Sangla',          // seasonal/optional qualifiers go here
  isSeasonal: false,                  // true for days that depend on road access
  overnight: 'sangla',                // destination slug from places.ts
  media: 'hero-vehicles',             // image stem from media-source/manifest.json
  mapSegment: null,                   // null = road drawn automatically
  stops: [ … ],
}
```

The map draws a road for every day with two or more map stops. Days that end where they start (the Kaza loops)
become loops, and a day with a single map stop (a rest day) keeps the car still and shows `REST / <PLACE>`.
`mapSegment` accepts a hand-drawn SVG path (viewBox 3200×110) if you want a specific shape.

### Stops and attractions

```ts
{ name: 'Gue', type: 'detour', destination: 'gue', optional: true }
{ name: 'Return to Kaza', type: 'overnight', destination: 'kaza', mapLabel: 'Kaza · return' }
{ name: 'Local market', type: 'activity', showOnMap: false }
```

- **`type`**: `start`, `overnight`, `monastery`, `lake`, `pass` and `detour` get their own pin label; other
  types show "stop".
- **`optional: true`** adds "· optional" to the chip and pin.
- **`seasonal: true`** marks a stop that depends on road access.
- **`showOnMap: false`** keeps the chip but drops the map pin.

New places go in `src/content/places.ts`. Leave coordinates out unless they're verified.

### Publish / unpublish

`status: 'published'` builds the page; `'draft'` keeps the file in the repo but builds nothing (the URL 404s
and it leaves the sitemap). The route with `isFeatured: true` is the homepage itinerary.

## Photos

Put the file in `media-source/`, add an entry to `media-source/manifest.json` (honest alt text, credit,
licence), and reference its `stem` from content. Responsive AVIF/WebP variants are generated automatically and
cached between builds. See [docs/ASSETS.md](docs/ASSETS.md): several stock day photos show the wrong place and
must be replaced.

## WhatsApp

Every CTA is a direct `https://wa.me/<number>?text=…` link built at build time
(`src/components/conversion/WhatsAppLink.astro`), so it works without JavaScript and needs no server:

```
Hello Spiti Darshan,
I am interested in a private Spiti taxi.

I am interested in Day 5:          ← only on "Ask about this day"
Key → Kibber → Chicham

Route: Shimla → Spiti → Manali
Travel dates:
Travellers:
Pickup city:

Please confirm route availability and price.
```

**Measuring leads:** a static site has no click log. Count enquiries where they happen: WhatsApp Business
labels (enquiry → quote → booked), or a simple sheet. For traffic, Vercel Web Analytics is cookieless and can be
enabled in the dashboard. Clicks aren't bookings; track qualified enquiries, quotes, bookings and revenue.

## Commands

| Command                                                           | What it does                                                                 |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                                                        | Dev server                                                                   |
| `pnpm build`                                                      | Image variants (cached) + static build into `dist/`                          |
| `pnpm preview`                                                    | Serve `dist/` on 127.0.0.1:4400                                              |
| `pnpm check` · `pnpm lint` · `pnpm format`                        | Typecheck · ESLint · Prettier                                                |
| `pnpm test`                                                       | Unit tests (content validation, map geometry vs the original, WhatsApp, SEO) |
| `pnpm test:e2e`                                                   | Build + Playwright on desktop and mobile                                     |
| `pnpm visual:capture <url> <dir>` / `pnpm visual:compare <a> <b>` | Screenshots at 5 viewports + pixel diff                                      |

## SEO checklist

Every page gets these automatically: a unique title and description, an absolute canonical URL, robots,
Open Graph and Twitter cards with a 1200×630 image, one H1, JSON-LD (`Organization`, `WebPage`, `TouristTrip`,
`BreadcrumbList`), the sitemap, and crawlable links. `robots.txt` allows every crawler.

When editing content:

- [ ] SEO title ≤ 60 characters and description ≤ 160, both specific to the route
- [ ] Days, stops and notes are real and **different** from other routes (no city-name-swapped pages)
- [ ] Photos show the actual places, with honest alt text
- [ ] No invented prices, ratings, reviews, phone numbers, addresses or fleet sizes, in copy or schema
- [ ] Don't change a published slug; if you must, add a redirect in `vercel.json`

## Before launch — owner inputs

- [ ] Verified WhatsApp number → Vercel env `BUSINESS_WHATSAPP_NUMBER`
- [ ] Custom domain → Vercel domains + `PUBLIC_SITE_URL`
- [ ] Full-size originals of the two vehicle photos (current: 680×510, 510×510)
- [ ] Replace mislocated stock day photos, **especially day 9 (Kathmandu)**
- [ ] About-page copy (then remove `noindex` in `src/pages/about.astro`)
