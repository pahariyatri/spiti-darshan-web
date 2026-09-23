# Migration plan — Spiti Darshan single HTML → Astro + PostgreSQL

Source of truth: `reference/original.html` (the approved `Spiti_Darshan_Transport_Landing_Page(9).html`,
241 618 bytes, restored verbatim). Nothing in this migration may change how that page looks or behaves
unless listed under "Intentional changes" below.

## 1. Current architecture (audit)

One self-contained HTML document:

| Part     | What it is                                                                                                                                                                                                                                                                                                                          | Notes                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `<head>` | title, meta description, OG title/description/type, robots, theme-color                                                                                                                                                                                                                                                             | no canonical, no og:image, no og:url                                                                           |
| JSON-LD  | `TouristTrip` with 9 `ListItem` day names, provider `TravelAgency`                                                                                                                                                                                                                                                                  | hardcoded                                                                                                      |
| Fonts    | Google Fonts: DM Sans 400–700, Playfair Display 500–700, `display=swap`                                                                                                                                                                                                                                                             | kept as-is                                                                                                     |
| CSS      | ~60 lines of minified CSS in one `<style>`                                                                                                                                                                                                                                                                                          | three "layers" appended over time (base → route v2 → "final route UI") that override each other; order matters |
| Images   | `--photo-one` (hero: white Innova Crystas in the mountains) and `--photo-two` (vehicles parked on a mountain route) as **base64 WebP inside CSS custom properties** (~199 KB)                                                                                                                                                       | the two real Spiti Darshan photos                                                                              |
|          | 6 remote day photos (5 Unsplash, 1 Pexels) layered over the local photos as CSS fallbacks                                                                                                                                                                                                                                           | remote, uncropped, no `srcset`                                                                                 |
| Hero     | full-bleed background photo with gradient overlays, absolute header, H1 with `<em>` accent, 2 CTAs, seasonal note, scroll prompt                                                                                                                                                                                                    | `photoArrival` scale animation                                                                                 |
| Journey  | intro, **sticky route bar** (`.route-sticky`): leg title, current place, stop counter, day counter, and a 56–76 px tall "nav map"                                                                                                                                                                                                   | map is an 820–1060 % / 2800 px wide `.map-world` panned with `translate3d`                                     |
| Road     | one SVG path (viewBox 3200×110, `preserveAspectRatio=none`) drawn twice (casing + asphalt) plus an invisible measuring path                                                                                                                                                                                                         | the path is literally the 8 segment strings concatenated                                                       |
| Days     | 9 `<article class="day">` chapters with background photo, eyebrow, H3, hook, stop "chips" (`<button>`), note, "Ask about this day" link                                                                                                                                                                                             | stop chips are the SEO-visible attraction list                                                                 |
| JS       | `routeDays` array (leg label + `[name, kind]` pins per day), `segmentDefs` (8 SVG segments), `legRanges` mapping 9 days → segment indices `[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,6],[6,7],[7,8]]`                                                                                                                                 | day 7 is stationary; days 5 & 6 are loops ending where they start                                              |
|          | `update()` on rAF-throttled scroll: find active day at a "target line" 46 % below the sticky bar, compute local progress, place car on path, rotate to heading, pan world, render pins for the active day only, show label for current pin + next pin if far enough, highlight chip, set `aria-current="step"`, parallax day photos | reduced-motion: car snaps to stops, no parallax                                                                |
|          | chip click → smooth-scroll so the target line lands on that stop                                                                                                                                                                                                                                                                    |                                                                                                                |
|          | WhatsApp: `BUSINESS_WHATSAPP = ''` → `wa.me/?text=` fallback; all `.whatsapp-link` rewritten by JS; day links append "I am interested in Day N (leg)"                                                                                                                                                                               | **SEO/no-JS issue:** without JS every CTA points to `#contact`                                                 |
| Proof    | vehicle photo + copy + safety note ("not a 4×4 snow-expedition vehicle")                                                                                                                                                                                                                                                            | background-image photo                                                                                         |
| Contact  | CTA + preview smallprint                                                                                                                                                                                                                                                                                                            |                                                                                                                |
| FAQ      | 3 `<details>`                                                                                                                                                                                                                                                                                                                       | no FAQ schema (correct — keep it that way)                                                                     |
| Footer   | year (JS), official district route link                                                                                                                                                                                                                                                                                             |                                                                                                                |
| Mobile   | fixed bottom WhatsApp bar ≤ 900 px                                                                                                                                                                                                                                                                                                  |                                                                                                                |

### Quirks worth preserving on purpose

- Pin label kind text: `stay→overnight`, `start→depart`, `detour→optional`, `monastery`, `lake`, `pass`, everything else `stop` (so `attraction` pins read "stop").
- Map pin names differ from chip names on some days (`Kaza · return` vs `Return to Kaza`, `Chandratal · seasonal` vs `Chandratal`, day 7 has 4 chips but 1 pin). The chip index maps to pin index with `min(i, count-1)`.
- Day 1 is `is-active` in the HTML so the first paint matches the post-JS state.

## 2. Migration risks

| Risk                                                                        | Mitigation                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS cascade order (three override layers) breaks when split into components | Keep the stylesheet **one file, same order** (`src/styles/site.css`), only replace `var(--photo-*)` backgrounds with `<picture>` elements that reproduce `background-size:cover`/`background-position` using `object-fit`/`object-position`. No scoped Astro styles for public UI. |
| Background images → `<img>` changes layout                                  | `<img>` is absolutely positioned inside the existing `.hero-photo` / `.day-photo` / `.proof-photo` boxes, so the boxes (and their transforms/animations) are unchanged.                                                                                                            |
| Map geometry hardcoded for 9 days                                           | Store an SVG segment per **route day** (`route_days.map_segment`, nullable = stationary day). Client concatenates segments, derives `legRanges` from cumulative lengths. Routes without hand-drawn geometry get a deterministic generated schematic (loops for "return" days).     |
| The car SVG / pin behaviour drifts                                          | Port the car SVG byte-for-byte; port `update()` line-by-line into typed TS; E2E asserts pins/labels/`aria-current` per day.                                                                                                                                                        |
| LCP regression (base64 hero is inline today, zero requests)                 | Hero `<img>` is `fetchpriority="high"`, not lazy, preloaded, AVIF/WebP `srcset`. Day photos lazy.                                                                                                                                                                                  |
| Remote Unsplash/Pexels images disappear                                     | Download once (both licenses allow self-hosting), generate local variants, record provenance in `media_assets` + `docs/ASSETS.md`.                                                                                                                                                 |
| No-JS/SEO: CTAs only work with JS                                           | CTAs become real server-rendered links to `/go/whatsapp?...`.                                                                                                                                                                                                                      |
| Duplicate content: homepage vs `/routes/shimla-to-spiti/`                   | Homepage keeps the brand hero/H1; route page has a route-specific H1, route-facts block and its own canonical. The featured route's canonical can be pointed at `/` via SEO fields if the owner prefers.                                                                           |
| Business facts unknown (phone, address, prices, fleet)                      | Never invented. Env/config placeholders; the "Preview: add the verified business number" note stays visible until `BUSINESS_WHATSAPP_NUMBER` is set.                                                                                                                               |
| Prerendered homepage reading the DB at build                                | Build fails loudly if the DB is unreachable (no silent fallback data). Route pages are SSR so admin publishing is immediate.                                                                                                                                                       |

## 3. Section → Astro mapping

| Original                    | Astro                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `<head>` meta               | `components/seo/SeoHead.astro` fed by `lib/seo/meta.ts` (`buildPageMeta`)                                                    |
| JSON-LD                     | `components/seo/JsonLd.astro` + `lib/seo/schema.ts` (Organization, TouristTrip, BreadcrumbList, WebPage)                     |
| `<style>`                   | `styles/site.css` (verbatim order) + `styles/pages.css` (supporting pages) + `styles/admin.css`                              |
| hero + header               | `components/Hero.astro`, `components/Header.astro`                                                                           |
| journey intro + sticky map  | `components/journey/JourneySection.astro`, `JourneyMap.astro`, `VehicleMarker.astro`                                         |
| day articles                | `components/journey/JourneyDay.astro` (+ `JourneyStop.astro` chip)                                                           |
| JS map logic                | `lib/journey/client.ts` (browser, rAF) + `lib/journey/geometry.ts` (pure, unit-tested)                                       |
| `routeDays` / `segmentDefs` | DB `routes`, `route_days`, `route_day_stops`, serialised into `<script type="application/json">` by `lib/journey/payload.ts` |
| proof                       | `components/vehicles/VehicleProof.astro`                                                                                     |
| contact                     | `components/conversion/ContactSection.astro`                                                                                 |
| WhatsApp links              | `components/conversion/WhatsAppLink.astro` → `/go/whatsapp` → `lib/whatsapp/*`                                               |
| mobile bar                  | `components/conversion/MobileWhatsAppCTA.astro`                                                                              |
| FAQ                         | `components/FaqSection.astro` (content from `routes` FAQ rows? **no** — static component; FAQs are business-wide)            |
| footer                      | `components/Footer.astro`                                                                                                    |

Pages: `/` (prerendered), `/routes/` (SSR list), `/routes/[slug]/` (SSR, cached), `/vehicles/innova-crysta/`,
`/about/`, `/contact/` (prerendered), `/404`, `/500`, `/go/whatsapp`, `/api/event`, `/sitemap.xml`,
`/robots.txt`, `/admin/**` (SSR, authenticated).

`/spiti-taxi/` and `/spiti-road-guide/` are **not** created: they need owner-verified editorial content, and
empty placeholder pages would be exactly the thin SEO pages the brief forbids. The URL scheme is reserved.

## 4. Folder structure

```
src/
  actions/index.ts            Astro Actions (admin mutations, Zod-validated)
  components/ (Header, Hero, FaqSection, Footer, journey/, vehicles/, conversion/, seo/, admin/)
  layouts/ BaseLayout.astro, RouteLayout.astro, PageLayout.astro, AdminLayout.astro
  pages/  index, 404, 500, about, contact, vehicles/innova-crysta, routes/index, routes/[slug],
          go/whatsapp.ts, api/event.ts, sitemap.xml.ts, robots.txt.ts, media/[...path].ts, admin/**
  lib/
    config/ env.ts, site.ts          (validated env, business constants)
    db/ client.ts, schema.ts, seed/, migrate.ts
    repositories/ routes.ts, places.ts, media.ts, leads.ts, admins.ts
    services/ route-service.ts, publish.ts
    journey/ geometry.ts, payload.ts, client.ts
    whatsapp/ message.ts, redirect.ts
    seo/ meta.ts, schema.ts
    analytics/ attribution.ts (client), events.ts
    auth/ password.ts, session.ts, rate-limit.ts
    media/ variants.ts
    validation/ route.ts, lead.ts
  middleware.ts              security headers, admin guard
  styles/
scripts/ build-images.ts, backup-db.sh, create-admin.ts
tests/ unit/, integration/, e2e/, visual/
drizzle/ (generated migrations)
deploy/ (systemd, Caddyfile, nginx.conf)
docs/ ASSETS.md
```

## 5. SQL schema (PostgreSQL)

```sql
routes(id pk, slug unique, name, short_title, summary, starting_location, ending_location,
       duration_days, route_type, seasonality, status draft|published|archived, is_featured,
       hero_kicker, hero_title, hero_title_accent, hero_subtitle, hero_note, hero_media_id fk,
       published_at, created_at, updated_at)                         idx(status), idx(slug)
route_days(id, route_id fk cascade, day_number, title, subtitle, map_leg_label, short_description,
           day_note, is_seasonal, overnight_destination_id fk null, media_id fk null,
           map_segment null, display_order)       unique(route_id, day_number), idx(route_id, display_order)
destinations(id, slug unique, name, region, short_description, latitude, longitude, is_major_stop)
attractions(id, slug unique, name, destination_id fk null, attraction_type, short_description,
            latitude, longitude, is_optional)
route_day_stops(id, route_day_id fk cascade, destination_id fk null, attraction_id fk null,
                stop_name, map_label null, stop_type, display_order, is_optional, is_seasonal,
                show_on_map, map_progress_position null)          idx(route_day_id, display_order)
vehicles(id, slug unique, name, vehicle_type, passenger_capacity null, luggage_note, active)
route_vehicle_types(route_id fk, vehicle_id fk, pk(route_id, vehicle_id))
media_assets(id, path unique, alt, width, height, variant_widths int[], formats text[],
             credit, license, source_url, created_at)
seo_metadata(id, entity_type, entity_id, meta_title, meta_description, canonical_path, og_title,
             og_description, og_image_id fk null, robots, schema_override jsonb null)
                                                                  unique(entity_type, entity_id)
business_settings(key pk, value, updated_at)
lead_intents(id, event_type whatsapp_click|route_view|route_day_interest, route_id fk null,
             day_number null, cta_location, referrer_host, utm_source, utm_medium, utm_campaign,
             utm_term, utm_content, created_at)                   idx(created_at), idx(route_id)
admin_users(id, email unique, password_hash, role, created_at, last_login_at)
admin_sessions(id = sha256(token) pk, user_id fk cascade, expires_at, created_at)  idx(expires_at)
```

No IP addresses, no names/phones: the conversation itself stays on WhatsApp.

## 6. Intentional changes (the only visual/behavioural deltas)

1. Background photos become `<picture>` elements inside the same boxes (srcset, AVIF/WebP, lazy below the fold).
2. CTAs are real `href`s to `/go/whatsapp/?…` (they work without JS and log anonymous intent).
3. Optional stop chips render "· optional" consistently (the original showed it for Gue and Pin Valley but
   not Chitkul, whose map pin already said "optional").
4. The footer year is rendered server-side, and the footer gains a small crawlable nav (Routes, Innova Crysta,
   Contact, About).
5. `og:url`, `og:image`, canonical and Twitter card added; the JSON-LD provider becomes `Organization`.
6. **Owner edit (2026-09-23):** the hero subtitle and the hero seasonal note were removed at the owner's request.
   The seasonal information remains on days 8–9, in the FAQ and in the route-facts block.
7. Accessibility: the gold eyebrow on the sand background (2.0:1) goes to `#8f6330` (4.7:1); muted text goes
   `#617469` → `#5c6e63` (4.4 → 4.8:1); the brand link uses its visible text as its accessible name; the car
   marker is `aria-hidden`.
8. Bug fix: the original left the previous day's chip highlighted (`aria-current` on two chips); only the
   active day's chip is marked now.
9. Performance: fonts are self-hosted (same families) and CSS is inlined. Journey screenshots are unchanged.

## Update (2026-09-23): static site

At the owner's request the site became fully static on Vercel. The PostgreSQL schema, admin and click logging
described in §4–5 were removed (preserved at tag `v0.1-postgres-admin`), and routes are now typed content in
`src/content/`. Also by owner request: the journey intro block was removed and day photos are taller.

## Status (2026-09-23, before the static switch)

All ten phases are implemented and verified: typecheck and lint clean, 59 unit and integration tests,
30 Playwright E2E tests (desktop and mobile), migrations applied from an empty database, and the seed checked
against the original map script. Lighthouse mobile: 98 / 100 / 100 / 100 (LCP 2.4 s, CLS 0, TBT 0). Visual
diff vs `reference/original.html`: journey states 0.00–0.03% at 390, 430, 768, 1440 and 1920; the hero
differs only by change 6.

## 7. Phases

1 Audit (this doc) · 2 Scaffold · 3 Visual migration · 4 Typed data · 5 PostgreSQL · 6 Dynamic routes ·
7 Admin · 8 WhatsApp + analytics · 9 SEO · 10 QA (typecheck, lint, unit, integration, Playwright,
screenshots at 390×844, 430×932, 768×1024, 1440×900, 1920×1080 against the original).
