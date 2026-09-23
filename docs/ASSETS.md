# Image assets

Source images live in `media-source/` (committed). `pnpm images` generates responsive variants into
`public/media/` (git-ignored, rebuilt on every build). Provenance is also stored in the `media_assets` table
and shown under **Admin → Media**.

| Asset                              | Used for                                             | Source & licence                                            | Status                                                                                                       |
| ---------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `hero-vehicles` (`photo-one.webp`) | Hero, days 1/6/7, vehicle page, default social image | Spiti Darshan's own photo, extracted from the approved page | ✅ Real. ⚠ Only **680×510**: shown full-screen, so it looks soft on large screens. **Request the original.** |
| `fleet-parked` (`photo-two.webp`)  | Vehicle proof section, day 5                         | Spiti Darshan's own photo                                   | ✅ Real. ⚠ Only **510×510**. **Request the original.**                                                       |
| `day-kinnaur-valley`               | Day 2 (Sangla → Kalpa)                               | Unsplash `1626621341517`, Unsplash License                  | ⚠ Stock photo of a snow trek, not Chitkul or Kalpa. Replace.                                                 |
| `day-cold-desert`                  | Day 3 (Kalpa → Tabo)                                 | Unsplash `1597074866923`, Unsplash License                  | ❌ Shows **Shimla town**, not the cold desert. Replace.                                                      |
| `day-old-spiti`                    | Day 4 (Tabo → Kaza)                                  | Pexels `31874842`, Pexels License                           | ⚠ Plausible desert road; location unverified.                                                                |
| `day-high-pass`                    | Day 8 (Kunzum/Chandratal)                            | Unsplash `1609920658906`, Unsplash License                  | ❌ Shows a forested river valley, not the high pass. Replace.                                                |
| `day-chandra-valley`               | Day 9 (Chandratal → Manali)                          | Unsplash `1605640840605`, Unsplash License                  | ❌ **Wrong country**: Boudhanath Stupa, Kathmandu (Nepal). **Replace before launch.**                        |

The approved page's day-6 image (`unsplash 1571406252260`) already returned **404** upstream, so the page
has always shown its CSS fallback (the hero vehicle photo). The migration keeps that.

Alt text describes what is **visible** in each photo; it doesn't claim a location the photo doesn't show.

## Replacing a photo

1. **Admin → Media → Upload**: add your own photo (JPEG/PNG/WebP/AVIF ≤ 12 MB) with honest alt text and a credit.
2. Choose it on the day (or as the route hero). Done: variants are generated on upload.

To replace a _built-in_ image instead, put the file in `media-source/`, update `media-source/manifest.json`, and
run `pnpm images`.

Only use photos you own, or whose licence you have checked and recorded in the credit and licence fields.
