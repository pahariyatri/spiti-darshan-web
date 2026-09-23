import { expect, test, type Page } from '@playwright/test';

const MOBILE = [360, 375, 390, 412, 430];
const DESKTOP = [1366, 1440, 1920];

/** Scroll so the middle of day N sits on the map script's target line. */
async function focusDay(page: Page, day: number) {
  await page.evaluate((d) => {
    const el = document.getElementById(`day${d}`)!;
    const sticky = document.getElementById('routeSticky')!;
    const target = sticky.offsetHeight + Math.max(70, (innerHeight - sticky.offsetHeight) * 0.46);
    scrollTo({
      top: el.getBoundingClientRect().top + scrollY + el.offsetHeight * 0.5 - target,
      behavior: 'instant',
    });
  }, day);
  // The map updates on the next animation frame; wait for it instead of a fixed delay.
  await page.waitForFunction(
    (d) => document.getElementById(`day${d}`)?.classList.contains('is-active'),
    day,
  );
  await page.waitForTimeout(50);
}

for (const width of [...MOBILE, ...DESKTOP]) {
  const height = width < 900 ? 800 : 900;
  test(`layout @ ${width}px: no overflow, sticky map never covers a day heading`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    for (const day of [1, 3, 5, 7, 9]) {
      await focusDay(page, day);
      const r = await page.evaluate((d) => {
        const sticky = document.getElementById('routeSticky')!.getBoundingClientRect();
        const article = document.getElementById(`day${d}`)!.getBoundingClientRect();
        const h3 = document.querySelector(`#day${d} h3`)!.getBoundingClientRect();
        const ask = document.querySelector(`#day${d} .day-enquire`)!.getBoundingClientRect();
        const bar = document.querySelector('.mobile-book')!.getBoundingClientRect();
        const barShown =
          getComputedStyle(document.querySelector('.mobile-book')!).display !== 'none';
        const below = innerHeight - sticky.bottom;
        const visible =
          Math.min(article.bottom, innerHeight) - Math.max(article.top, sticky.bottom);
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          headingClear: h3.top >= sticky.bottom - 1 && h3.bottom <= innerHeight,
          share: visible / below,
          active: document.getElementById(`day${d}`)!.classList.contains('is-active'),
          askClear: !barShown || ask.bottom <= bar.top,
        };
      }, day);
      expect(r.overflow, `overflow day ${day}`).toBeLessThanOrEqual(0);
      expect(r.active, `day ${day} active`).toBe(true);
      expect(r.askClear, `day ${day} "Ask about this day" not under the WhatsApp bar`).toBe(true);
      expect(r.headingClear, `day ${day} heading visible below the sticky map`).toBe(true);
      // Mobile: the focused day dominates the screen below the sticky map.
      if (width < 900) expect(r.share, `day ${day} share of screen`).toBeGreaterThanOrEqual(0.9);
    }
  });
}

test('track shows only the road and car, with the car visible throughout the journey', async ({
  page,
}) => {
  test.setTimeout(120_000); // 80 scroll positions × 2 widths
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/');
    await expect(page.locator('#navMap')).not.toHaveClass(/has-active-leg/);
    await expect(page.locator('.road-base .road-lane')).toHaveCount(1);
    for (const day of [1, 2, 3, 4, 5, 6, 8, 9]) {
      for (const f of [0.05, 0.3, 0.55, 0.8, 0.95]) {
        await page.evaluate(
          ({ d, f }) => {
            const el = document.getElementById(`day${d}`)!;
            const s = document.getElementById('routeSticky')!;
            const t = s.offsetHeight + Math.max(70, (innerHeight - s.offsetHeight) * 0.46);
            scrollTo({
              top: el.getBoundingClientRect().top + scrollY + el.offsetHeight * f - t,
              behavior: 'instant',
            });
          },
          { d: day, f },
        );
        await page.waitForTimeout(120);
        const r = await page.evaluate(() => {
          const car = document.getElementById('mapCar')!.getBoundingClientRect();
          const track = document.getElementById('navMap')!.getBoundingClientRect();
          return {
            markers: document.querySelectorAll('#navMap .map-pin, #navMap .pin-label').length,
            visible:
              car.left >= track.left &&
              car.right <= track.right &&
              car.top >= track.top &&
              car.bottom <= track.bottom,
          };
        });
        expect(r.markers).toBe(0);
        expect(r.visible, `car visible: day ${day} @${f} ${width}px`).toBe(true);
      }
    }
  }
});

test('WhatsApp click is tracked with context and still opens WhatsApp', async ({
  page,
  context,
}) => {
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'whatsapp' }));
  await page.goto('/?utm_source=instagram&utm_campaign=autumn');
  await focusDay(page, 5);
  const popup = page.waitForEvent('popup');
  await page.locator('#day5 a.day-enquire').click();
  const opened = await popup;
  expect(opened.url()).toMatch(/^https:\/\/wa\.me\/916230070301\?text=/);
  const events = await page.evaluate(() =>
    (window.dataLayer ?? []).filter(
      (e) => (e as { event?: string } | null)?.event === 'whatsapp_click',
    ),
  );
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    cta_location: 'day-card',
    page_path: '/',
    route: 'Shimla → Spiti → Manali',
    day: 5,
    utm_source: 'instagram',
    utm_campaign: 'autumn',
  });
});

test('WhatsApp still opens when tracking throws', async ({ page, context }) => {
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'whatsapp' }));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'dataLayer', {
      get: () => {
        throw new Error('blocked');
      },
      set: () => {},
    });
  });
  await page.goto('/');
  const popup = page.waitForEvent('popup');
  await page.locator('.hero-actions a.whatsapp-link').click();
  expect((await popup).url()).toMatch(/^https:\/\/wa\.me\/916230070301/);
});

test('road guide: SEO basics, schema, internal links and CTA', async ({ page }) => {
  const res = await page.goto('/spiti-road-guide/');
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/Spiti road guide/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    /\/spiti-road-guide\/$/,
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toContain('"@type":"Article"');
  expect(ld).toContain('"@type":"BreadcrumbList"');
  for (const h of [
    'Kunzum Pass and Chandratal (seasonal)',
    'When to go',
    'What it means for your vehicle',
  ]) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  }
  await expect(page.locator('a[href="/routes/shimla-to-spiti/#day8"]')).toHaveCount(1);
  await expect(page.locator('.guide a[href="/vehicles/innova-crysta/"]').first()).toBeVisible();
  await expect(
    page.locator('a.whatsapp-link[href^="https://wa.me/916230070301"]').first(),
  ).toBeVisible();
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/spiti-road-guide/</loc>');
});

test('hero is simple: one H1, short line, WhatsApp + itinerary CTAs, no scroll prompt', async ({
  page,
}) => {
  await page.goto('/');
  const hero = page.locator('.hero');
  await expect(hero.locator('h1')).toHaveCount(1);
  expect(((await hero.locator('.hero-sub').textContent()) ?? '').length).toBeLessThan(100);
  await expect(hero.locator('.hero-actions a')).toHaveCount(2);
  await expect(hero.locator('.hero-actions a').first()).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/916230070301/,
  );
  await expect(hero.locator('.hero-actions a').nth(1)).toHaveAttribute('href', '#journey');
  await expect(page.locator('.scroll-prompt')).toHaveCount(0);
});
