import type { Page } from '@playwright/test';

import { attachScreenshot, expect, test } from './fixtures';

const categories = [
  {
    id: 1,
    name: 'Food',
    definition: 'Groceries, meals, coffee, and drinks including alcohol.',
  },
  {
    id: 2,
    name: 'Other',
    definition: 'Spending outside the other categories.',
  },
  {
    id: 3,
    name: 'Income',
    definition: 'Salary, interest received, and gifts received.',
  },
  {
    id: 4,
    name: 'Transfers',
    definition: 'Moving money between your own accounts.',
  },
  { id: 5, name: 'Bills', definition: 'Household bills and loan repayments.' },
  {
    id: 6,
    name: 'Subscriptions',
    definition: 'Streaming, software, and memberships.',
  },
  {
    id: 7,
    name: 'Transport',
    definition: 'Transport tickets, fuel, parking, and maintenance.',
  },
  { id: 8, name: 'Shopping', definition: 'Retail purchases.' },
  {
    id: 9,
    name: 'Savings & investments',
    definition: 'Contributions and withdrawals.',
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
      amount_pence: -450,
      raw_description: 'SYNTHETIC CAFE',
      source_type: 'POS',
      category_id: null as number | null,
    },
    {
      id: 2,
      account_name: 'NatWest',
      transaction_date: '2026-09-03',
      amount_pence: 200,
      raw_description: 'SYNTHETIC LUNCH REPAYMENT',
      source_type: 'BAC',
      category_id: null as number | null,
    },
    {
      id: 3,
      account_name: 'Nationwide',
      transaction_date: '2026-09-02',
      amount_pence: 200000,
      raw_description: 'SYNTHETIC SALARY',
      source_type: null,
      category_id: 3 as number | null,
    },
    {
      id: 4,
      account_name: 'Amex',
      transaction_date: '2026-09-01',
      amount_pence: 50000,
      raw_description: 'SYNTHETIC CARD PAYMENT',
      source_type: null,
      category_id: 4 as number | null,
    },
    {
      id: 5,
      account_name: 'NatWest',
      transaction_date: '2026-09-01',
      amount_pence: 2500,
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
  await page.goto('/import');
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
  await choose(page, 'Category for selection', 'Food');
  await attachScreenshot(page, testInfo, 'transactions-selected');

  await page.getByRole('button', { name: 'Apply to selected' }).click();

  await expect(page.getByRole('status')).toHaveText('Updated 2 transactions.');
  await expect(page.getByRole('row')).toHaveCount(2);
  expect(decisions[0]).toEqual({ transaction_ids: [1, 2], category_id: 1 });
  await choose(page, 'Filter by category', 'Food');
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await choose(page, 'Category for selection', 'Other');
  await page.getByRole('button', { name: 'Apply to selected' }).click();
  await expect(page.getByRole('status')).toHaveText('Updated 1 transaction.');
  await choose(page, 'Filter by category', 'Other');
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await choose(page, 'Category for selection', 'Clear category');
  await page.getByRole('button', { name: 'Apply to selected' }).click();
  await expect(
    page.getByText('No transactions match this category.'),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Updated 1 transaction.');
  await choose(page, 'Filter by category', 'All categories');
  await expect(
    page.getByRole('row').filter({ hasText: 'SYNTHETIC CAFE' }),
  ).toContainText('Uncategorized');
  await attachScreenshot(page, testInfo, 'transactions-reviewed');
});

test('searches descriptions, selects every match and categorizes them together', async ({
  page,
}, testInfo) => {
  const decisions = await mockTransactions(page);
  await page.goto('/transactions');
  await choose(page, 'Filter by category', 'Uncategorized');
  await page.getByLabel('Search descriptions').fill('payment');
  await expect(page.getByText('2 of 3 transactions')).toBeVisible();
  const selectAll = page.getByLabel('Select all shown transactions');
  await page.getByLabel('Select transaction 2:', { exact: false }).check();
  await expect(selectAll).toHaveAttribute('data-state', 'indeterminate');
  await attachScreenshot(page, testInfo, 'transactions-search-partly-selected');
  await selectAll.click();
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible();
  await choose(page, 'Category for selection', 'Shopping');
  await attachScreenshot(page, testInfo, 'transactions-search-all-selected');

  await page.getByRole('button', { name: 'Apply to selected' }).click();

  await expect(page.getByRole('status')).toHaveText('Updated 2 transactions.');
  expect(decisions).toEqual([{ transaction_ids: [2, 5], category_id: 8 }]);
  await expect(
    page.getByText('No transactions match “payment”.'),
  ).toBeVisible();
  await attachScreenshot(page, testInfo, 'transactions-search-done');
});

test('keeps a failed decision selected for retry and clears selection when filtering', async ({
  page,
}, testInfo) => {
  const decisions = await mockTransactions(page, true);
  await page.goto('/transactions');
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await choose(page, 'Category for selection', 'Food');

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
  await choose(page, 'Category for selection', 'Food');
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
  await expect(
    page.getByRole('region', { name: 'Categorize selected transactions' }),
  ).toHaveCount(0);
  await attachScreenshot(page, testInfo, 'transactions-empty');
});

for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`keeps the categorize controls in view while scrolling a long list on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    const rows = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      account_name: 'NatWest',
      transaction_date: '2026-09-01',
      amount_pence: -(index + 1) * 100,
      raw_description: `SYNTHETIC SHOP ${index + 1}`,
      source_type: 'POS',
      category_id: null,
    }));
    await page.route('**/api/categories', (route) =>
      route.fulfill({ json: categories }),
    );
    await page.route('**/api/transactions', (route) =>
      route.fulfill({ json: rows }),
    );
    await page.setViewportSize(viewport);
    await page.goto('/transactions');
    await choose(page, 'Category for selection', 'Food');

    await page.getByLabel('Select transaction 40:', { exact: false }).check();

    await expect(
      page.getByRole('button', { name: 'Apply to selected' }),
    ).toBeInViewport();
    await expect(
      page.getByLabel('Select transaction 40:', { exact: false }),
    ).toBeInViewport();
    await testInfo.attach(`transactions-scrolled-${viewport.name}`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}

test('offers all nine categories and assigns savings to a selected transaction', async ({
  page,
}, testInfo) => {
  await mockTransactions(page);
  await page.goto('/transactions');
  await page.getByLabel('Select transaction 5:', { exact: false }).check();
  await page.getByLabel('Category for selection').click();

  for (const category of categories) {
    await expect(
      page.getByRole('option', { name: category.name, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole('option', { name: 'Savings & investments', exact: true })
    .click();
  await page.getByRole('button', { name: 'Apply to selected' }).click();
  await expect(page.getByRole('status')).toHaveText('Updated 1 transaction.');
  await expect(
    page.getByRole('row').filter({ hasText: 'SYNTHETIC PERSONAL PAYMENT' }),
  ).toContainText('Savings & investments');
  await attachScreenshot(page, testInfo, 'savings-category-assignment');
});
