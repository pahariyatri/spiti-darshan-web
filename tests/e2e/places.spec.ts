import { expect, test } from '@playwright/test';

test('stop clicks stay on the route with direct WhatsApp enquiries', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#your-driver')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Explore Gue on day 3', exact: true })).toHaveText(
    'Gue',
  );
  const chip = page.getByRole('link', { name: 'Explore Komic on day 6', exact: true });
  await chip.click();
  await expect(page.locator('#currentPlace')).toHaveText('Komic');
  await expect(page.locator('#stopCard')).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#day6 .day-enquire')).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/916230070301\?text=.*Day%206/,
  );
  await page.goto('/vehicles/innova-crysta/');
  await expect(page.locator('#your-driver')).toContainText('Mukul');
});

test('itinerary stays on page without JavaScript; destination guides remain accessible directly', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/routes/shimla-to-spiti/');
  await page.getByRole('link', { name: 'Explore Komic on day 6', exact: true }).click();
  await expect(page).toHaveURL(/\/routes\/shimla-to-spiti\/#day6$/);
  await expect(page.locator('#day6 .day-enquire')).toHaveAttribute('href', /^https:\/\/wa\.me\//);
  await page.goto('/places/komic/');
  await expect(page.locator('h1')).toHaveText('Komic');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/places\/komic\/$/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /high village/);
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  );
  expect(schema['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual(
    expect.arrayContaining(['Place', 'BreadcrumbList', 'WebPage']),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
