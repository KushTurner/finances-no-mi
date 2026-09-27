import { expect, test } from './fixtures';

test('shows the application home page', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Finances No MI' }),
  ).toBeVisible();

  await testInfo.attach('home-page', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
