# Spiti Darshan — web

Private taxi and transport for Spiti Valley. The site's job is to get a visitor from search to a
**WhatsApp conversation**: a commercial route page, then an understanding of itinerary, vehicle and stops,
then WhatsApp, a quote and a booking.

A **fully static** Astro 7 site in TypeScript, hosted on Vercel. There is no database and no server: every
page is HTML generated at build time from typed content files. Every page is rendered from
typed route data.

Further reading: [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) ·
[docs/ASSETS.md](docs/ASSETS.md)

## Local setup

Requirements: Node 22, pnpm 11.

```bash
pnpm install
cp .env.example .env     # optional locally
pnpm dev                 # http://localhost:4321
pnpm build && pnpm preview   # production build on http://127.0.0.1:4400
```

## Environment variables (build time)

| Variable                   | Purpose                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BUSINESS_WHATSAPP_NUMBER` | **Required.** The single business WhatsApp number (`916230070301`) used by every CTA, the footer and structured data. The build fails if it's missing. Set on Vercel (Production/Preview/Development). |
| `PUBLIC_SITE_URL`          | Canonical origin (canonical URLs, sitemap, social cards). On Vercel it defaults to the project's production domain. Set it once you have a custom domain.                                              |

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

Pages: `/`, `/routes/`, `/routes/<slug>/` (one per published route), `/spiti-road-guide/`, `/vehicles/innova-crysta/`,
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

Every CTA is a direct `https://wa.me/916230070301?text=…` link built at build time
(`src/components/conversion/WhatsAppLink.astro`), so it works without JavaScript. Messages are short:

```
Hello Spiti Darshan! I'd like a quote for a private Spiti taxi.
Route: Shimla → Spiti → Manali
Interested in: Day 5 — Key → Kibber → Chicham   ← only on "Ask about this day"
Dates:
Travellers:
```

### Click tracking

`src/lib/analytics/whatsapp-tracking.ts` records every WhatsApp click as a `whatsapp_click` event with
`cta_location` (header, hero, day-card, contact, mobile-bar, route-facts, page), `page_path`, `route`, `day`
and the visit's UTM tags (kept for the session). Events are pushed to `window.dataLayer` (usable with Google Tag
Manager) and sent to GA4 when `PUBLIC_GA4_ID` is set. The tracker never calls `preventDefault` and swallows its
own errors, so WhatsApp always opens (tested). A click is intent, not a booking: track enquiries, quotes and
bookings in WhatsApp Business.

## Commands

| Command                                    | What it does                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `pnpm dev`                                 | Dev server                                                                   |
| `pnpm build`                               | Image variants (cached) + static build into `dist/`                          |
| `pnpm preview`                             | Serve `dist/` on 127.0.0.1:4400                                              |
| `pnpm check` · `pnpm lint` · `pnpm format` | Typecheck · ESLint · Prettier                                                |
| `pnpm test`                                | Unit tests (content validation, map geometry vs the original, WhatsApp, SEO) |
| `pnpm test:e2e`                            | Build + Playwright on desktop and mobile                                     |

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

- [x] Verified WhatsApp number: +91 62300 70301 (`src/lib/config/site.ts`)
- [ ] Custom domain → Vercel domains + `PUBLIC_SITE_URL`
- [ ] Full-size originals of the two vehicle photos (current: 680×510, 510×510)
- [ ] Replace mislocated stock day photos, **especially day 9 (Kathmandu)**
- [ ] About-page copy (then remove `noindex` in `src/pages/about.astro`)
