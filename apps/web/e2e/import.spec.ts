/// <reference lib="dom" />

import type { Page, TestInfo } from '@playwright/test';

import { expect, test } from './fixtures';

const accounts = [
  {
    id: 1,
    name: 'Everyday',
    institution: 'natwest',
    account_type: 'current_account',
  },
  { id: 2, name: 'Card', institution: 'amex', account_type: 'credit_card' },
  {
    id: 3,
    name: 'Rainy Day',
    institution: 'nationwide',
    account_type: 'savings',
  },
];

const institutionsByFilename: Record<string, string> = {
  'natwest.csv': 'natwest',
  'amex.csv': 'amex',
  'nationwide.csv': 'nationwide',
};

type MockResponse = { status: number; json: unknown };

const completed: MockResponse = {
  status: 201,
  json: {
    import_id: 1,
    new_transaction_count: 12,
    existing_transaction_count: 3,
  },
};

function syntheticStatement(name: string) {
  return {
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from('Date,Description\n01 Jan 2026,SYNTHETIC COFFEE\n'),
  };
}

async function mockApi(
  page: Page,
  importResponses: Record<number, MockResponse>,
) {
  await page.route('**/api/accounts', (route) =>
    route.fulfill({ json: accounts }),
  );
  await page.route('**/api/statements/institution', (route) => {
    const filename = /filename="([^"]+)"/.exec(
      route.request().postData() ?? '',
    )?.[1];
    return route.fulfill({
      json: { institution: institutionsByFilename[filename ?? ''] ?? null },
    });
  });
  await page.route('**/api/accounts/*/imports', (route) => {
    const accountId = Number(
      new URL(route.request().url()).pathname.split('/')[3],
    );
    return route.fulfill(importResponses[accountId]);
  });
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

test('imports dropped statements into the accounts at their banks', async ({
  page,
}, testInfo) => {
  await mockApi(page, { 1: completed, 2: completed });
  await page.goto('/');
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    for (const name of ['natwest.csv', 'amex.csv']) {
      transfer.items.add(new File(['Date\n'], name, { type: 'text/csv' }));
    }
    return transfer;
  });

  await page
    .getByText('Drop statement CSVs here')
    .dispatchEvent('drop', { dataTransfer });
  await page.getByRole('button', { name: 'Import 2 statements' }).click();

  await expect(page.getByRole('status')).toHaveCount(2);
  await attachScreenshot(page, testInfo, 'dropped-statements-imported');
});

test('shows the outcome of each chosen statement', async ({
  page,
}, testInfo) => {
  await mockApi(page, {
    1: completed,
    2: { status: 409, json: { detail: 'Already imported' } },
    3: {
      status: 400,
      json: { errors: [{ row_number: 4, message: 'Invalid amount' }] },
    },
  });
  await page.goto('/');

  await page
    .getByLabel(/Drop statement CSVs/)
    .setInputFiles(
      ['natwest.csv', 'amex.csv', 'nationwide.csv', 'notes.csv'].map(
        syntheticStatement,
      ),
    );
  await page.getByRole('button', { name: 'Import 3 statements' }).click();

  await expect(
    page.getByRole('listitem', { name: 'nationwide.csv' }),
  ).toContainText('Row 4: Invalid amount');
  await expect(page.getByRole('listitem', { name: 'amex.csv' })).toContainText(
    'This file has already been imported.',
  );
  await expect(page.getByRole('listitem', { name: 'notes.csv' })).toContainText(
    'Not a supported Amex, NatWest, or Nationwide statement.',
  );
  await attachScreenshot(page, testInfo, 'statement-outcomes');
});
