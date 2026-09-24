import { expect, test } from '@playwright/test';

test('compact navigation works on short pages and supports keyboard dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/contact/');
  const toggle = page.getByLabel('Navigation menu', { exact: true });
  const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
  await toggle.click();
  const contact = menu.getByRole('link', { name: 'Contact' });
  await expect(contact).toBeVisible();
  expect(
    await contact.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return el.contains(
        document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
      );
    }),
  ).toBe(true);
  await toggle.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await menu.getByRole('link', { name: 'Winter Spiti' }).click();
  await expect(page).toHaveURL(/\/#winter$/);
  await expect(page.getByRole('heading', { name: 'Experience White Spiti.' })).toBeInViewport();
  await expect(menu).toBeHidden();
});

test('supporting pages fit narrow screens with working navigation without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 740 },
  });
  const page = await context.newPage();
  for (const path of [
    '/about/',
    '/contact/',
    '/routes/',
    '/vehicles/innova-crysta/',
    '/places/',
    '/spiti-road-guide/',
  ]) {
    await page.goto(`http://127.0.0.1:4400${path}`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      path,
    ).toBeLessThanOrEqual(0);
    await page.getByLabel('Navigation menu', { exact: true }).click();
    await expect(
      page
        .getByRole('navigation', { name: 'Mobile navigation' })
        .getByRole('link', { name: 'Contact' }),
    ).toBeVisible();
  }
  await context.close();
});
