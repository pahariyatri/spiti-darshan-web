import { expect, test } from '@playwright/test';

test('stop preview preserves map movement and links to a destination guide', async ({ page }) => {
  await page.goto('/');
  const chip = page.getByRole('link', { name: 'Explore Komic on day 6', exact: true });
  await chip.click();
  const card = page.locator('#stopCard');
  await expect(card).toBeVisible();
  await expect(chip).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#currentPlace')).toHaveText('Komic');
  await expect(page.locator('#stopCardTitle')).toHaveText('Komic');
  const bounds = await card.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(chip).toHaveAttribute('aria-expanded', 'false');
  await chip.click();
  await page.getByRole('link', { name: 'Read more about Komic' }).click();
  await expect(page).toHaveURL(/\/places\/komic\/$/);
  await expect(page.locator('h1')).toHaveText('Komic');
  await expect(page.getByRole('link', { name: 'Day 6: Langza → Hikkim → Komic' })).toHaveAttribute(
    'href',
    '/routes/shimla-to-spiti/#day6',
  );
});

test('guides and itinerary links work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/routes/shimla-to-spiti/');
  await page.getByRole('link', { name: 'Explore Komic on day 6', exact: true }).click();
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
