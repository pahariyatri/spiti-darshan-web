import { expect, test, type Page } from '@playwright/test';

async function scrollToDay(page: Page, day: number, fraction = 0.5) {
  await page.evaluate(
    ({ day, fraction }) => {
      const el = document.getElementById(`day${day}`)!;
      const sticky = document.getElementById('routeSticky')!;
      const target = sticky.offsetHeight + Math.max(70, (innerHeight - sticky.offsetHeight) * 0.46);
      scrollTo({
        top: el.getBoundingClientRect().top + scrollY + el.offsetHeight * fraction - target,
        behavior: 'instant',
      });
    },
    { day, fraction },
  );
  await page.waitForTimeout(250);
}

test('homepage loads with the approved hero, SEO tags and structured data', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Private Shimla to Spiti Taxi & Innova Crysta | Spiti Darshan');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('The road to Spiti.');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /-og\.jpg$/);
  const ld = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
  );
  expect(JSON.stringify(ld)).toContain('TouristTrip');
  await expect(page.locator('.hero-photo img')).toHaveAttribute('fetchpriority', 'high');
  await expect(page.locator('.proof-photo img')).toBeVisible();
});

test('the route animation initialises and follows the scroll', async ({ page }) => {
  await page.goto('/');
  await scrollToDay(page, 1, 0.1);
  const car = page.locator('#mapCar');
  const before = await car.evaluate((el) => el.style.left);
  expect(before).not.toBe('');
  await expect(page.locator('#pinLayer .map-pin')).toHaveCount(6);
  await scrollToDay(page, 1, 0.9);
  expect(await car.evaluate((el) => el.style.left)).not.toBe(before);
  await expect(page.locator('#mapCar svg > *')).toHaveCount(14); // the original Innova SVG, element for element
});

test('scrolling through days updates the active day, pins and aria-current', async ({ page }) => {
  await page.goto('/');
  await scrollToDay(page, 5, 0.55);
  await expect(page.locator('#dayCounter')).toHaveText('DAY 05 / 09');
  await expect(page.locator('#currentLeg')).toHaveText('Key → Kibber → Chicham');
  await expect(page.locator('#day5')).toHaveClass(/is-active/);
  await expect(page.locator('#day5 .stop[aria-current="step"]')).toHaveCount(1);
  await expect(page.locator('.stop[aria-current="step"]')).toHaveCount(1);
  await expect(page.locator('#pinLayer .map-pin')).toHaveCount(5);
  await expect(page.locator('#pinLayer .map-pin.is-current .pin-label')).toBeVisible();

  await scrollToDay(page, 7, 0.5);
  await expect(page.locator('#stopCounter')).toHaveText('REST / KAZA');
  await expect(page.locator('#pinLayer .map-pin')).toHaveCount(1);
});

test('tapping a stop chip moves the journey to that stop', async ({ page }) => {
  await page.goto('/');
  await scrollToDay(page, 3, 0.1);
  await page.locator('#day3 .stop', { hasText: 'Nako' }).click();
  await expect(page.locator('#currentPlace')).toHaveText('Nako', { timeout: 5000 });
});

test('no horizontal document overflow', async ({ page }) => {
  for (const path of [
    '/',
    '/routes/shimla-to-spiti/',
    '/routes/',
    '/vehicles/innova-crysta/',
    '/contact/',
    '/about/',
    '/does-not-exist/',
  ]) {
    await page.goto(path);
    for (const day of path === '/' ? [1, 5, 9] : []) await scrollToDay(page, day);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('route page ships the full itinerary in server HTML', async ({ page }) => {
    await page.goto('/routes/shimla-to-spiti/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('article.day')).toHaveCount(9);
    for (const text of [
      'Key Monastery',
      'Chicham Bridge',
      'Kunzum Pass',
      'Gue · optional',
      'Pin Valley · optional',
      'Atal Tunnel',
    ]) {
      await expect(page.locator('.stop', { hasText: text }).first()).toBeAttached();
    }
    await expect(page.locator('#day8 .day-note')).toHaveText(
      'Seasonal road and accommodation must be confirmed before booking.',
    );
    await expect(page.locator('.route-facts')).toContainText('Days 8, 9');
    await expect(page.locator('a.day-enquire').nth(4)).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/.*Day%205%3A%0AKey%20%E2%86%92%20Kibber/,
    );
  });
});

test('WhatsApp CTAs are direct wa.me links with the agreed message', async ({ page }) => {
  await page.goto('/');
  const decode = async (sel: string) =>
    decodeURIComponent((await page.locator(sel).first().getAttribute('href')) ?? '');
  const day5 = await decode('#day5 a.day-enquire');
  expect(day5).toMatch(/^https:\/\/wa\.me\//);
  expect(day5).toContain('I am interested in Day 5:\nKey → Kibber → Chicham');
  expect(day5).toContain('Route: Shimla → Spiti → Manali');
  expect(await decode('.hero-actions a.whatsapp-link')).toContain(
    'Please confirm route availability and price.',
  );
  await expect(page.locator('a.whatsapp-link').first()).toHaveAttribute('target', '_blank');
});

test('mobile sticky WhatsApp bar', async ({ page, isMobile }) => {
  await page.goto('/');
  const bar = page.locator('.mobile-book');
  if (!isMobile) {
    await expect(bar).toBeHidden();
    return;
  }
  await expect(bar).toBeVisible();
  await scrollToDay(page, 6);
  await expect(bar).toBeVisible();
  const box = await bar.boundingBox();
  expect(box!.y + box!.height).toBeGreaterThan(844 - 30);
  await expect(bar.locator('a')).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/.*Route%3A%20Shimla%20%E2%86%92%20Spiti/,
  );
});

test('unknown pages return the custom 404', async ({ page }) => {
  for (const path of ['/nope/', '/routes/not-a-route/']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(page.locator('h1')).toContainText("This road doesn't go anywhere.");
  }
});

test('sitemap and robots', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/routes/shimla-to-spiti/</loc>');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).not.toContain('Disallow');
  expect(robots).toContain('Sitemap:');
});

test('reduced motion keeps the itinerary readable', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await scrollToDay(page, 4);
  await expect(page.locator('#dayCounter')).toHaveText('DAY 04 / 09');
  await expect(page.locator('#day4 h3')).toHaveText('Tabo → Kaza');
  await context.close();
});
