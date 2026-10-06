/// <reference lib="dom" />

import type { Page } from '@playwright/test';

import { attachScreenshot, expect, test } from './fixtures';

type MockResponse = { status: number; json: unknown };

function completed(accountName: string): MockResponse {
  return {
    status: 201,
    json: {
      import_id: 1,
      account_name: accountName,
      new_transaction_count: 12,
      existing_transaction_count: 3,
    },
  };
}

function syntheticStatement(name: string) {
  return {
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from('Date,Description\n01 Jan 2026,SYNTHETIC COFFEE\n'),
  };
}

async function mockImports(
  page: Page,
  responsesByFilename: Record<string, MockResponse>,
) {
  await page.route('**/api/imports', (route) => {
    const filename = /filename="([^"]+)"/.exec(
      route.request().postData() ?? '',
    )?.[1];
    return route.fulfill(responsesByFilename[filename ?? '']);
  });
}

test('imports dropped statements into the accounts for their banks', async ({
  page,
}, testInfo) => {
  await mockImports(page, {
    'natwest.csv': completed('NatWest'),
    'amex.csv': completed('Amex'),
  });
  await page.goto('/import');
  await attachScreenshot(page, testInfo, 'import-empty');
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
  await expect(
    page.getByRole('listitem', { name: 'natwest.csv' }),
  ).toContainText('Ready to import');
  await attachScreenshot(page, testInfo, 'statements-queued');
  await page.getByRole('button', { name: 'Import 2 statements' }).click();

  await expect(
    page.getByRole('listitem', { name: 'amex.csv' }).getByRole('status'),
  ).toHaveText('Imported into Amex: 12 new transactions, 3 already imported.');
  await expect(page.getByRole('button', { name: /^Import/ })).toHaveCount(0);
  await attachScreenshot(page, testInfo, 'dropped-statements-imported');
});

test('shows the outcome of each chosen statement', async ({
  page,
}, testInfo) => {
  await mockImports(page, {
    'natwest.csv': completed('NatWest'),
    'amex.csv': {
      status: 409,
      json: { detail: 'This file has already been imported' },
    },
    'nationwide.csv': {
      status: 400,
      json: { errors: [{ row_number: 4, message: 'Invalid amount' }] },
    },
    'notes.csv': {
      status: 400,
      json: {
        errors: [
          {
            row_number: null,
            message:
              'No header row matches a supported Amex, NatWest, or Nationwide statement',
          },
        ],
      },
    },
  });
  await page.goto('/import');

  await page
    .getByLabel(/Drop statement CSVs/)
    .setInputFiles(
      ['natwest.csv', 'amex.csv', 'nationwide.csv', 'notes.csv'].map(
        syntheticStatement,
      ),
    );
  await page.getByRole('button', { name: 'Import 4 statements' }).click();

  await expect(page.getByRole('listitem', { name: 'notes.csv' })).toContainText(
    'No header row matches a supported Amex, NatWest, or Nationwide statement',
  );
  await expect(
    page.getByRole('listitem', { name: 'nationwide.csv' }),
  ).toContainText('Row 4: Invalid amount');
  await expect(page.getByRole('listitem', { name: 'amex.csv' })).toContainText(
    'This file has already been imported.',
  );
  await attachScreenshot(page, testInfo, 'statement-outcomes');
});
