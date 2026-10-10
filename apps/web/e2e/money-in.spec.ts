import type { Page } from '@playwright/test';

import { attachScreenshot, expect, test } from './fixtures';

type Mark = 'income' | 'repayment' | 'own_account' | null;

async function choose(page: Page, label: string, option: string) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function mockMoneyIn(page: Page) {
  const payers = [
    {
      id: 11,
      name: 'SYNTHETIC OWN SAVINGS',
      payment_count: 4,
      received_pence: 120000,
      latest_payment_date: '2026-10-02',
      counts_as: null as Mark,
    },
    {
      id: 12,
      name: 'SYNTHETIC FRIEND',
      payment_count: 2,
      received_pence: 4500,
      latest_payment_date: '2026-10-04',
      counts_as: null as Mark,
    },
    {
      id: 13,
      name: 'SYNTHETIC EMPLOYER SALARY',
      payment_count: 3,
      received_pence: 960000,
      latest_payment_date: '2026-09-25',
      counts_as: 'income' as Mark,
    },
  ];
  const payments = [
    {
      id: 21,
      account_name: 'NatWest',
      transaction_date: '2026-10-04',
      amount_pence: 3000,
      raw_description: 'SYNTHETIC FRIEND',
      source_type: 'BAC',
      counts_as: null as Mark,
      counts_as_source: null as 'payer' | 'human' | null,
    },
    {
      id: 22,
      account_name: 'NatWest',
      transaction_date: '2026-09-12',
      amount_pence: 1500,
      raw_description: 'SYNTHETIC FRIEND',
      source_type: 'BAC',
      counts_as: null as Mark,
      counts_as_source: null as 'payer' | 'human' | null,
    },
  ];
  const requests: unknown[] = [];
  await page.route('**/api/payers', (route) => route.fulfill({ json: payers }));
  await page.route('**/api/payers/12', (route) => {
    const { counts_as } = route.request().postDataJSON() as { counts_as: Mark };
    requests.push({ payer: 12, counts_as });
    payers[1].counts_as = counts_as;
    for (const payment of payments) {
      if (payment.counts_as_source !== 'human') {
        payment.counts_as = counts_as;
        payment.counts_as_source = counts_as ? 'payer' : null;
      }
    }
    return route.fulfill({ json: { updated_count: 2 } });
  });
  await page.route('**/api/transactions?payer=12', (route) =>
    route.fulfill({ json: payments }),
  );
  await page.route('**/api/transactions/counts-as', (route) => {
    const request = route.request().postDataJSON() as {
      transaction_ids: number[];
      counts_as: Mark;
    };
    requests.push(request);
    for (const payment of payments) {
      if (request.transaction_ids.includes(payment.id)) {
        payment.counts_as = request.counts_as;
        payment.counts_as_source = 'human';
      }
    }
    return route.fulfill({ json: { updated_count: 1 } });
  });
  return requests;
}

test('marks a payer as repayments and overrides one of their payments', async ({
  page,
}, testInfo) => {
  const requests = await mockMoneyIn(page);
  await page.goto('/import');
  await page.getByRole('link', { name: 'Money in' }).click();
  await expect(
    page.getByLabel('Money from SYNTHETIC EMPLOYER SALARY counts as'),
  ).toHaveText('Income');
  await attachScreenshot(page, testInfo, 'money-in-payers');

  await choose(page, 'Money from SYNTHETIC FRIEND counts as', 'Repayment');
  await page
    .getByRole('button', { name: 'Show payments from SYNTHETIC FRIEND' })
    .click();
  await choose(page, 'Payment on 12 Sep 2026 counts as', 'Income');

  await expect(page.getByText('Your choice')).toBeVisible();
  await expect(
    page.getByLabel('Money from SYNTHETIC FRIEND counts as'),
  ).toHaveText('Repayment');
  expect(requests).toEqual([
    { payer: 12, counts_as: 'repayment' },
    { transaction_ids: [22], counts_as: 'income' },
  ]);
  await attachScreenshot(page, testInfo, 'money-in-payer-expanded');
});

test('fits the payer list on a narrow screen', async ({ page }, testInfo) => {
  await mockMoneyIn(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/money-in');
  await page
    .getByRole('button', { name: 'Show payments from SYNTHETIC FRIEND' })
    .click();

  await expect(
    page.getByLabel('Payment on 4 Oct 2026 counts as'),
  ).toBeVisible();
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
  await attachScreenshot(page, testInfo, 'money-in-mobile');
});

test('explains when there is no money in yet and recovers from a failed load', async ({
  page,
}, testInfo) => {
  let failing = true;
  await page.route('**/api/payers', (route) =>
    failing ? route.fulfill({ status: 500 }) : route.fulfill({ json: [] }),
  );
  await page.goto('/money-in');
  await expect(page.getByRole('alert')).toContainText('Could not load payers');
  failing = false;

  await page.getByRole('button', { name: 'Retry' }).click();

  await expect(
    page.getByText('No money in yet. Import a statement to get started.'),
  ).toBeVisible();
  await attachScreenshot(page, testInfo, 'money-in-empty');
});
