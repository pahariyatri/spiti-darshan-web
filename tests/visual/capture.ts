/**
 * Captures comparable screenshots of a page at the agreed viewports.
 *   pnpm visual:capture <url> <outDir>
 * Reduced motion keeps the 14 s hero zoom and parallax deterministic on both sides.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

/** Journey states worth comparing: the sticky map with a given day active. */
export const JOURNEY_DAYS = [1, 5, 7, 9] as const;

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) {
  console.error('usage: capture.ts <url> <outDir>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: vp, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const name = `${vp.width}x${vp.height}`;
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  for (const day of JOURNEY_DAYS) {
    // Put the middle of the day chapter on the script's "target line".
    await page.evaluate((d) => {
      const el = document.getElementById(`day${d}`)!;
      const sticky = document.getElementById('routeSticky')!;
      const target = sticky.offsetHeight + Math.max(70, (innerHeight - sticky.offsetHeight) * 0.46);
      const top = el.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + el.offsetHeight * 0.5 - target, behavior: 'instant' });
    }, day);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `${name}-day${day}.png`) });
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, `${name}-full.png`), fullPage: true });
  console.info(`${name}: document overflow ${overflow}px`);
  await context.close();
}
await browser.close();
