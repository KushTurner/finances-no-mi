import type { Page } from '@playwright/test';

import { attachScreenshot, expect, test } from './fixtures';
import { syntheticAccounts, syntheticApi } from './overview-data';

test.use({ deviceScaleFactor: 2 });

function isSummaryRequest(url: URL) {
  return url.pathname.startsWith('/api/summary');
}

async function mockOverview(page: Page, api = syntheticApi()) {
  const requests: URL[] = [];
  await page.clock.setFixedTime(new Date('2026-10-06T12:00:00'));
  await page.route(isSummaryRequest, (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const from = url.searchParams.get('from') ?? '';
    const to = url.searchParams.get('to') ?? '';
    const accountIds = url.searchParams.getAll('account_id').map(Number);
    if (url.pathname.endsWith('/months')) {
      return route.fulfill({ json: api.months(from, to, accountIds) });
    }
    if (url.pathname.endsWith('/days')) {
      return route.fulfill({ json: api.days(from, to, accountIds) });
    }
    return route.fulfill({ json: api.summary(from, to, accountIds) });
  });
  return requests;
}

function panel(page: Page, name: string | RegExp) {
  return page.getByRole('region', { name });
}

test('shows this month up to the latest transaction and switches period in the URL', async ({
  page,
}, testInfo) => {
  await mockOverview(page);
  await page.goto('/');
  await expect(
    page.getByText('1 – 3 Oct 2026 · up to your latest transaction'),
  ).toBeVisible();
  await expect(panel(page, 'Totals')).not.toContainText('than');
  await expect(panel(page, 'October so far')).toContainText(
    'than by 3 September',
  );
  await attachScreenshot(page, testInfo, 'overview-this-month');

  await page.getByRole('button', { name: 'Last month', exact: true }).click();

  await expect(page).toHaveURL(/period=last_month/);
  await expect(
    page.getByText('1 – 30 Sep 2026', { exact: true }),
  ).toBeVisible();
  await expect(panel(page, 'Totals')).toContainText('than August');
  await expect(panel(page, 'September spending')).toContainText(
    'than August overall',
  );
  await attachScreenshot(page, testInfo, 'overview-last-month');
  await page.getByRole('button', { name: 'Last 12 months' }).click();
  await expect(panel(page, 'Totals')).toContainText(
    'Not enough history to compare',
  );
  await attachScreenshot(page, testInfo, 'overview-last-12-months');
});

test('shows every chart as a table with the same values', async ({
  page,
}, testInfo) => {
  await mockOverview(page);
  await page.goto('/');
  const monthly = panel(page, 'Monthly spending');
  await expect(monthly.getByRole('img')).toBeVisible();

  for (const name of [
    'October so far',
    'Spending by category',
    'Monthly spending',
    'Income and spending',
  ]) {
    await panel(page, name).getByRole('button', { name: 'Table' }).click();
  }

  await expect(monthly.getByRole('row')).toHaveCount(13);
  await expect(panel(page, 'October so far').getByRole('row')).toHaveCount(31);
  await expect(
    panel(page, 'Spending by category').getByRole('columnheader', {
      name: 'Share',
    }),
  ).toBeVisible();
  await expect(monthly).toContainText('October 2026 (incomplete)');
  await attachScreenshot(page, testInfo, 'overview-tables');
});

test('selecting account cards narrows every request and clearing restores all accounts', async ({
  page,
}, testInfo) => {
  const requests = await mockOverview(page);
  await page.goto('/');
  const amex = page.getByRole('button', { name: /^Amex, spent/ });
  await expect(amex).toBeVisible();
  requests.length = 0;

  await amex.click();

  await expect(amex).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/accounts=3$/);
  await expect(
    page.getByText('1 – 2 Oct 2026 · up to your latest transaction'),
  ).toBeVisible();
  await expect
    .poll(() => requests.map((url) => url.searchParams.getAll('account_id')))
    .toContainEqual(['3']);
  expect(
    requests.every(
      (url) => url.searchParams.getAll('account_id').join() === '3',
    ),
  ).toBe(true);
  await attachScreenshot(page, testInfo, 'overview-account-selected');
  await page.getByRole('button', { name: /^NatWest, spent/ }).click();
  await expect(page).toHaveURL(/accounts=1,3$/);
  await page.reload();
  await expect(amex).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^Nationwide, spent/ }).click();
  await expect(amex).toHaveAttribute('aria-pressed', 'false');
  await expect(page).not.toHaveURL(/accounts=/);
  await amex.click();
  await page.getByRole('button', { name: 'Show all accounts' }).click();
  await expect(page).not.toHaveURL(/accounts=/);
  await expect(amex).toHaveAttribute('aria-pressed', 'false');
});

test('hides every amount but keeps percentages, and remembers the choice', async ({
  page,
}, testInfo) => {
  await mockOverview(page);
  await page.goto('/?period=last_month');
  await expect(panel(page, 'Totals')).toContainText('£');

  await page.getByRole('button', { name: 'Hide amounts' }).click();

  const main = page.getByRole('main');
  await expect(main).not.toContainText(/£\d/);
  await expect(panel(page, 'Spending by category')).toContainText('%');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Hide amounts' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(panel(page, 'Totals')).toContainText('£••••');
  await expect(main).not.toContainText(/£\d/);
  await panel(page, 'Monthly spending')
    .getByRole('button', { name: 'Table' })
    .click();
  await expect(main).not.toContainText(/£\d/);
  await attachScreenshot(page, testInfo, 'overview-amounts-hidden');
});

test('links uncategorized transactions to the filtered transactions page', async ({
  page,
}) => {
  await mockOverview(page);
  await page.route('**/api/categories', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/transactions?*', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto('/');
  const notice = page.getByRole('note');
  await expect(notice).toContainText('categorized yet');

  await notice.getByRole('link', { name: 'Review in Transactions' }).click();

  await expect(page).toHaveURL(/\/transactions\?category=uncategorized/);
  await expect(page.getByLabel('Filter by category')).toHaveText(
    'Uncategorized',
  );
});

test('prompts an import when there are no accounts and explains an empty period', async ({
  page,
}, testInfo) => {
  await mockOverview(page, syntheticApi([]));
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Import a statement' }),
  ).toBeVisible();
  await attachScreenshot(page, testInfo, 'overview-no-accounts');
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await mockOverview(
    page,
    syntheticApi([{ id: 1, name: 'NatWest', latest: '2026-08-20' }]),
  );

  await page.goto('/');

  await expect(
    page.getByText(
      'No transactions in this period. The latest is on 15 Aug 2026.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^NatWest, spent £0.00/ }),
  ).toBeVisible();
  await attachScreenshot(page, testInfo, 'overview-empty-period');
});

test('recovers from a failed load with an explicit retry', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-06T12:00:00'));
  let failing = true;
  const api = syntheticApi();
  await page.route(isSummaryRequest, (route) => {
    const url = new URL(route.request().url());
    if (failing) return route.fulfill({ status: 500, body: '' });
    const ids = url.searchParams.getAll('account_id').map(Number);
    const from = url.searchParams.get('from') ?? '';
    const to = url.searchParams.get('to') ?? '';
    if (url.pathname.endsWith('/months'))
      return route.fulfill({ json: api.months(from, to, ids) });
    if (url.pathname.endsWith('/days'))
      return route.fulfill({ json: api.days(from, to, ids) });
    return route.fulfill({ json: api.summary(from, to, ids) });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'Could not load the overview',
  );
  await attachScreenshot(page, testInfo, 'overview-load-error');
  failing = false;

  await page.getByRole('button', { name: 'Retry' }).click();

  await expect(panel(page, 'Totals')).toBeVisible();
});

test('scrolls through more accounts than fit', async ({ page }, testInfo) => {
  await mockOverview(
    page,
    syntheticApi([
      ...syntheticAccounts,
      { id: 4, name: 'Joint account', latest: '2026-10-01' },
      { id: 5, name: 'Savings', latest: '2026-09-30' },
    ]),
  );
  await page.goto('/');
  const next = page.getByRole('button', { name: 'More accounts' });
  const previous = page.getByRole('button', { name: 'Previous accounts' });
  await expect(previous).toBeDisabled();

  await next.click();

  await expect(previous).toBeEnabled();
  await expect(
    page.getByRole('button', { name: /^Joint account, spent/ }),
  ).toBeInViewport({ ratio: 0.9 });
  await attachScreenshot(page, testInfo, 'overview-many-accounts');
});

test('fits a narrow screen without sideways page scrolling', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockOverview(page);
  await page.goto('/?period=last_90_days');
  await expect(panel(page, 'Totals')).toContainText(
    'than the previous 90 days',
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
  await attachScreenshot(page, testInfo, 'overview-mobile');
});
