import type { Page } from '@playwright/test';

import { attachScreenshot, expect, test } from './fixtures';

const categories = [
  {
    id: 1,
    name: 'Eating out',
    definition:
      'Restaurants, cafés, takeaways, and pubs outside a known travel context.',
  },
  {
    id: 2,
    name: 'Travel',
    definition: 'Holidays and trips, including accommodation and transport.',
  },
  {
    id: 3,
    name: 'Income',
    definition: 'Salary, interest received, and gifts received.',
  },
  {
    id: 4,
    name: 'Own-account transfers',
    definition: 'Moving money between your own accounts.',
  },
];

async function choose(page: Page, label: string, option: string) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function mockTransactions(page: Page, failFirstSave = false) {
  const rows = [
    {
      id: 1,
      account_name: 'NatWest',
      transaction_date: '2026-09-03',
      amount_minor: -450,
      raw_description: 'SYNTHETIC CAFE',
      source_type: 'POS',
      category_id: null as number | null,
    },
    {
      id: 2,
      account_name: 'NatWest',
      transaction_date: '2026-09-03',
      amount_minor: 200,
      raw_description: 'SYNTHETIC LUNCH REPAYMENT',
      source_type: 'BAC',
      category_id: null as number | null,
    },
    {
      id: 3,
      account_name: 'Nationwide',
      transaction_date: '2026-09-02',
      amount_minor: 200000,
      raw_description: 'SYNTHETIC SALARY',
      source_type: null,
      category_id: 3 as number | null,
    },
    {
      id: 4,
      account_name: 'Amex',
      transaction_date: '2026-09-01',
      amount_minor: 50000,
      raw_description: 'SYNTHETIC CARD PAYMENT',
      source_type: null,
      category_id: 4 as number | null,
    },
    {
      id: 5,
      account_name: 'NatWest',
      transaction_date: '2026-09-01',
      amount_minor: 2500,
      raw_description: 'SYNTHETIC PERSONAL PAYMENT',
      source_type: 'BAC',
      category_id: null as number | null,
    },
  ];
  const decisions: { transaction_ids: number[]; category_id: number | null }[] =
    [];
  await page.route('**/api/categories', (route) =>
    route.fulfill({ json: categories }),
  );
  await page.route('**/api/transactions?*', (route) => {
    const category = new URL(route.request().url()).searchParams.get(
      'category',
    );
    return route.fulfill({
      json: rows.filter((row) =>
        category === 'uncategorized'
          ? row.category_id === null
          : row.category_id === Number(category),
      ),
    });
  });
  await page.route('**/api/transactions', (route) =>
    route.fulfill({ json: rows }),
  );
  await page.route('**/api/transactions/category', (route) => {
    if (failFirstSave) {
      failFirstSave = false;
      return route.fulfill({
        status: 500,
        json: { detail: 'Synthetic failure' },
      });
    }
    const decision = route.request().postDataJSON() as {
      transaction_ids: number[];
      category_id: number | null;
    };
    decisions.push(decision);
    for (const row of rows) {
      if (decision.transaction_ids.includes(row.id))
        row.category_id = decision.category_id;
    }
    return route.fulfill({
      json: { updated_count: decision.transaction_ids.length },
    });
  });
  return decisions;
}

test('browses, categorizes selected transactions, corrects and clears an assignment', async ({
  page,
}, testInfo) => {
  const decisions = await mockTransactions(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'overview-placeholder');
  await page.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: '+£2,000.00', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: '-£4.50', exact: true }),
  ).toBeVisible();
  await choose(page, 'Filter by category', 'Uncategorized');
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await page.getByLabel('Select transaction 2:', { exact: false }).check();
  await choose(page, 'Category for selection', 'Eating out');
  await attachScreenshot(page, testInfo, 'transactions-selected');

  await page.getByRole('button', { name: 'Apply to selected' }).click();

  await expect(page.getByRole('status')).toHaveText('Updated 2 transactions.');
  await expect(page.getByRole('row')).toHaveCount(2);
  expect(decisions[0]).toEqual({ transaction_ids: [1, 2], category_id: 1 });
  await choose(page, 'Filter by category', 'Eating out');
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await choose(page, 'Category for selection', 'Travel');
  await page.getByRole('button', { name: 'Apply to selected' }).click();
  await expect(page.getByRole('status')).toHaveText('Updated 1 transaction.');
  await choose(page, 'Filter by category', 'Travel');
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await choose(page, 'Category for selection', 'Clear category');
  await page.getByRole('button', { name: 'Apply to selected' }).click();
  await expect(
    page.getByText('No transactions match this category.'),
  ).toBeVisible();
  await choose(page, 'Filter by category', 'All categories');
  await expect(
    page.getByRole('row').filter({ hasText: 'SYNTHETIC CAFE' }),
  ).toContainText('Uncategorized');
  await attachScreenshot(page, testInfo, 'transactions-reviewed');
});

test('keeps a failed decision selected for retry and clears selection when filtering', async ({
  page,
}, testInfo) => {
  const decisions = await mockTransactions(page, true);
  await page.goto('/transactions');
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await choose(page, 'Category for selection', 'Eating out');

  await page.getByRole('button', { name: 'Apply to selected' }).click();

  await expect(page.getByRole('alert')).toContainText(
    'Could not save categories',
  );
  await expect(
    page.getByLabel('Select transaction 1:', { exact: false }),
  ).toBeChecked();
  await attachScreenshot(page, testInfo, 'transactions-save-failed');
  await page.getByRole('button', { name: 'Apply to selected' }).click();
  await expect(page.getByRole('status')).toHaveText('Updated 1 transaction.');
  expect(decisions).toEqual([{ transaction_ids: [1], category_id: 1 }]);
  await page.getByLabel('Select transaction 2:', { exact: false }).check();
  await choose(page, 'Filter by category', 'Income');
  await expect(page.getByText('0 selected', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Apply to selected' }),
  ).toBeDisabled();
});

test('shows the transaction list and editing controls on a narrow screen', async ({
  page,
}, testInfo) => {
  await mockTransactions(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/transactions');
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await choose(page, 'Category for selection', 'Eating out');
  await expect(
    page.getByRole('button', { name: 'Apply to selected' }),
  ).toBeInViewport();
  await attachScreenshot(page, testInfo, 'transactions-mobile');
});

test('recovers from a failed load with an explicit retry', async ({
  page,
}, testInfo) => {
  let failing = true;
  await page.route('**/api/categories', (route) =>
    failing
      ? route.fulfill({ status: 500 })
      : route.fulfill({ json: categories }),
  );
  await page.route('**/api/transactions', (route) =>
    failing ? route.fulfill({ status: 500 }) : route.fulfill({ json: [] }),
  );
  await page.goto('/transactions');
  await expect(page.getByRole('alert')).toContainText(
    'Could not load transactions',
  );
  await attachScreenshot(page, testInfo, 'transactions-load-failed');
  failing = false;

  await page.getByRole('button', { name: 'Retry' }).click();

  await expect(
    page.getByText('No transactions yet. Import a statement to get started.'),
  ).toBeVisible();
  await attachScreenshot(page, testInfo, 'transactions-empty');
});
