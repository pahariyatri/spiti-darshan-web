# Technical decisions

## Static site on Vercel

Astro 7 builds every page to plain HTML at build time (`output: 'static'`), and Vercel serves it from its CDN.
There is no server, database or admin panel: the business flow (search → route page → WhatsApp) doesn't need
one. The result is fast, free to host, and has nothing to back up, secure or keep running.

## Routes are content, not pages

Each route is a typed file in `src/content/routes/`, and shared places and vehicles live in
`src/content/places.ts`. `src/lib/content/routes.ts` validates everything at build time (unknown place or
photo, gaps in day numbers, missing hero, not exactly one featured route), so broken content fails the build
instead of reaching visitors. The homepage and every `/routes/<slug>/` page render through the single
`RouteLayout`.

## The journey map

`src/lib/journey/client.ts` is a small vanilla-TypeScript script, with no UI framework and no hydration. It
moves the Innova marker along an SVG road as you scroll. Each day has an SVG `mapSegment`; days without one
get a generated curve, or a loop when the day returns to where it started, and a day with one map stop keeps
the car still. Per frame it reads layout once, then writes transforms and classes only. Reduced motion is
respected.

## WhatsApp-first

Every CTA is a direct `wa.me` link built at build time from one function (`src/lib/whatsapp/message.ts`), so it
works without JavaScript. The verified number lives in `SITE.whatsapp`; `BUSINESS_WHATSAPP_NUMBER` can override
it. Enquiries, quotes and bookings are tracked in WhatsApp Business, not on the site.

## Performance

- Photos: `scripts/build-images.ts` makes AVIF and WebP variants (480–2000 px, never upscaled) plus a
  1200×630 social image, cached by content hash between builds. The hero is eager and preloaded; the rest
  are lazy. Width and height are always set, so there's no layout shift.
- Fonts: DM Sans and Playfair Display (OFL) are self-hosted with preloads, and the ~20 KB stylesheet is
  inlined, so nothing blocks rendering.
- Lighthouse mobile: performance 98, and 100 for accessibility, best practices and SEO.

## SEO

Every page has a unique title and description, an absolute canonical URL, Open Graph and Twitter tags, one
H1, and JSON-LD (`Organization` with the WhatsApp contact point, `WebPage`, `TouristTrip` listing every day,
`BreadcrumbList`). Every day, stop and seasonal note is in the HTML, not rendered by JavaScript. There's a
sitemap, and `robots.txt` allows all crawlers. No invented ratings, prices, reviews or addresses.

## Security

Astro emits a hash-based CSP `<meta>` for scripts and styles. `vercel.json` adds `frame-ancestors 'none'`,
HSTS, `nosniff`, `Referrer-Policy` and `Permissions-Policy`. There are no forms, cookies or user data.
