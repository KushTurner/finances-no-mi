import type { Page } from '@playwright/test';

import { attachScreenshot, expect, test } from './fixtures';

const rows = [
  {
    id: 1,
    account_name: 'NatWest',
    transaction_date: '2026-09-03',
    amount_pence: -450,
    raw_description: 'SYNTHETIC CAFE',
    source_type: 'POS',
  },
  {
    id: 2,
    account_name: 'NatWest',
    transaction_date: '2026-09-03',
    amount_pence: 200,
    raw_description: 'SYNTHETIC LUNCH REPAYMENT',
    source_type: 'BAC',
  },
  {
    id: 3,
    account_name: 'Nationwide',
    transaction_date: '2026-09-02',
    amount_pence: 200000,
    raw_description: 'SYNTHETIC SALARY',
    source_type: null,
  },
  {
    id: 4,
    account_name: 'Amex',
    transaction_date: '2026-09-01',
    amount_pence: 50000,
    raw_description: 'SYNTHETIC CARD PAYMENT',
    source_type: null,
  },
  {
    id: 5,
    account_name: 'NatWest',
    transaction_date: '2026-09-01',
    amount_pence: 2500,
    raw_description: 'SYNTHETIC PERSONAL PAYMENT',
    source_type: 'BAC',
  },
];

async function mockTransactions(page: Page) {
  await page.route('**/api/transactions', (route) =>
    route.fulfill({ json: rows }),
  );
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
