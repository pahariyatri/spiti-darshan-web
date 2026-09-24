import { chromium } from '@playwright/test';
const [, , url, out, w = '1440', h = '900'] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: 'networkidle' });
for (let y = 0; y < 30000; y += 600) {
  await p.evaluate((y) => scrollTo(0, y), y);
  await p.waitForTimeout(30);
}
await p.evaluate(() => scrollTo(0, 0));
await p.screenshot({ path: out, fullPage: true });
await b.close();
