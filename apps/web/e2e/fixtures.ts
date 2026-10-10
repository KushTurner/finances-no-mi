import { expect, test as base } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

type NetworkFixtures = {
  networkGuard: void;
};

export const test = base.extend<NetworkFixtures>({
  networkGuard: [
    async ({ context }, use) => {
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        const isFrontendRequest = url.origin === 'http://127.0.0.1:4173';
        const isApiRequest = url.pathname.startsWith('/api/');

        if (isFrontendRequest && !isApiRequest) {
          await route.continue();
          return;
        }

        throw new Error(
          `Unexpected network request: ${url.origin}${url.pathname}`,
        );
      });

      await use();
    },
    { auto: true },
  ],
});

export async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  { fullPage = true } = {},
) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage, animations: 'disabled' }),
    contentType: 'image/png',
  });
}

export { expect };
