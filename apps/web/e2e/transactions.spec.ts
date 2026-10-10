import type { Page } from '@playwright/test';

import { attachScreenshot, expect, test } from './fixtures';

type Mark = 'income' | 'repayment' | 'own_account' | 'savings' | null;
type Source = 'payer' | 'human' | null;

const rows = [
  {
    id: 1,
    account_name: 'NatWest',
    transaction_date: '2026-09-03',
    amount_pence: -450,
    raw_description: 'SYNTHETIC CAFE',
    source_type: 'POS',
    counts_as: null as Mark,
    counts_as_source: null as Source,
  },
  {
    id: 2,
    account_name: 'NatWest',
    transaction_date: '2026-09-03',
    amount_pence: 200,
    raw_description: 'SYNTHETIC LUNCH REPAYMENT',
    source_type: 'BAC',
    counts_as: null as Mark,
    counts_as_source: null as Source,
  },
  {
    id: 3,
    account_name: 'Nationwide',
    transaction_date: '2026-09-02',
    amount_pence: 200000,
    raw_description: 'SYNTHETIC SALARY',
    source_type: null,
    counts_as: null as Mark,
    counts_as_source: null as Source,
  },
  {
    id: 4,
    account_name: 'Amex',
    transaction_date: '2026-09-01',
    amount_pence: 50000,
    raw_description: 'SYNTHETIC CARD PAYMENT',
    source_type: null,
    counts_as: null as Mark,
    counts_as_source: null as Source,
  },
  {
    id: 5,
    account_name: 'NatWest',
    transaction_date: '2026-09-01',
    amount_pence: 2500,
    raw_description: 'SYNTHETIC PERSONAL PAYMENT',
    source_type: 'BAC',
    counts_as: null as Mark,
    counts_as_source: null as Source,
  },
];

async function choose(page: Page, label: string, option: string) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function mockTransactions(page: Page) {
  const current = rows.map((row) => ({ ...row }));
  const requests: unknown[] = [];
  await page.route('**/api/transactions', (route) =>
    route.fulfill({ json: current }),
  );
  await page.route('**/api/transactions/counts-as', (route) => {
    const request = route.request().postDataJSON() as {
      transaction_ids: number[];
      counts_as: Mark;
    };
    requests.push(request);
    const marked = current.filter((row) =>
      request.transaction_ids.includes(row.id),
    );
    if (
      (request.counts_as === 'income' || request.counts_as === 'repayment') &&
      marked.some((row) => row.amount_pence < 0)
    ) {
      return route.fulfill({
        status: 400,
        json: { detail: 'Income and repayments can only be money coming in' },
      });
    }
    for (const row of marked) {
      row.counts_as = request.counts_as;
      row.counts_as_source = request.counts_as ? 'human' : null;
    }
    return route.fulfill({ json: { updated_count: marked.length } });
  });
  return requests;
}

test('browses transactions and narrows them by description', async ({
  page,
}, testInfo) => {
  await mockTransactions(page);
  await page.goto('/import');
  await page.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: '+£2,000.00', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('5 transactions')).toBeVisible();
  await attachScreenshot(page, testInfo, 'transactions-all');

  await page.getByLabel('Search descriptions').fill('payment');

  await expect(page.getByText('3 of 5 transactions')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(4);
  await attachScreenshot(page, testInfo, 'transactions-search');
  await page.getByLabel('Search descriptions').fill('synthetic bakery');
  await expect(
    page.getByText('No transactions match “synthetic bakery”.'),
  ).toBeVisible();
  await attachScreenshot(page, testInfo, 'transactions-search-empty');
});

test('marks every searched transaction and rejects income on money going out', async ({
  page,
}, testInfo) => {
  const requests = await mockTransactions(page);
  await page.goto('/transactions');
  await page.getByLabel('Search descriptions').fill('payment');
  const selectAll = page.getByLabel('Select all shown transactions');
  await page.getByLabel('Select transaction 4:', { exact: false }).check();
  await expect(selectAll).toHaveAttribute('data-state', 'indeterminate');
  await selectAll.click();
  await choose(page, 'Mark selected as', 'Own account');
  await attachScreenshot(page, testInfo, 'transactions-marking');

  await page.getByRole('button', { name: 'Apply to selected' }).click();

  await expect(page.getByRole('status')).toHaveText('Updated 3 transactions.');
  await expect(
    page.getByRole('row').filter({ hasText: 'SYNTHETIC CARD PAYMENT' }),
  ).toContainText('Own account');
  expect(requests).toEqual([
    { transaction_ids: [2, 4, 5], counts_as: 'own_account' },
  ]);
  await attachScreenshot(page, testInfo, 'transactions-marked');
  await page.getByLabel('Search descriptions').fill('cafe');
  await page.getByLabel('Select transaction 1:', { exact: false }).check();
  await choose(page, 'Mark selected as', 'Income');
  await page.getByRole('button', { name: 'Apply to selected' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Income and repayments can only be money coming in',
  );
  await expect(
    page.getByRole('row').filter({ hasText: 'SYNTHETIC CAFE' }),
  ).toContainText('Spending');
});

test('shows the transaction list and search on a narrow screen', async ({
  page,
}, testInfo) => {
  await mockTransactions(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/transactions');

  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByLabel('Search descriptions')).toBeInViewport();
  await attachScreenshot(page, testInfo, 'transactions-mobile');
});

test('recovers from a failed load with an explicit retry', async ({
  page,
}, testInfo) => {
  let failing = true;
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
