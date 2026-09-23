import { expect, test } from '@playwright/test';

test('admin pages reject unauthenticated visitors', async ({ page, request }) => {
  for (const path of ['/admin/', '/admin/routes/1/', '/admin/media/', '/admin/routes/1/preview/']) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(303);
    expect(res.headers()['location'], path).toContain('/admin/login/');
    expect(res.headers()['cache-control']).toBe('no-store');
  }
  await page.goto('/admin/');
  await expect(page).toHaveURL(/\/admin\/login\/\?next=/);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex,nofollow');
});

test('admin actions refuse requests without a session', async ({ request, baseURL }) => {
  const res = await request.post('/admin/routes/new/?_action=createRoute', {
    headers: { Origin: baseURL! },
    form: {
      slug: 'x',
      name: 'x',
      shortTitle: 'x',
      summary: 'x',
      startingLocation: 'x',
      endingLocation: 'x',
    },
    maxRedirects: 0,
  });
  expect([303, 401, 403]).toContain(res.status());
  const rpc = await request.post('/_actions/setRouteStatus/', {
    headers: { Origin: baseURL! },
    form: { id: '1', status: 'archived' },
  });
  expect(rpc.status()).toBe(401);
  const json = await request.post('/_actions/setRouteStatus/', {
    headers: { Origin: baseURL!, 'Content-Type': 'application/json' },
    data: { id: 1, status: 'archived' },
  });
  expect(json.status()).toBe(415); // form-only actions refuse other encodings outright
});

test('wrong credentials show an error and set no session', async ({ page, context }) => {
  await page.goto('/admin/login/');
  await page.getByLabel('Email').fill('nobody@example.test');
  await page.getByLabel('Password').fill('definitely-wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
  expect((await context.cookies()).filter((c) => c.name.includes('sd_admin'))).toHaveLength(0);
});
