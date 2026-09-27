import type { Page, TestInfo } from '@playwright/test';

import { expect, test } from './fixtures';

const syntheticStatement = {
  name: 'statement.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from(
    'Date,Type,Description,Value,Balance\n' +
      '01 Jan 2026,POS,SYNTHETIC COFFEE,-3.50,996.50\n',
  ),
};

async function mockAccounts(page: Page) {
  await page.route('**/api/accounts', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          name: 'Everyday',
          institution: 'natwest',
          account_type: 'current_account',
        },
      ],
    }),
  );
}

async function mockImport(page: Page, status: number, json: unknown) {
  await page.route('**/api/accounts/1/imports', (route) =>
    route.fulfill({ status, json }),
  );
}

async function submitStatement(page: Page) {
  await page.goto('/');
  await page.getByLabel('Account').selectOption({ label: 'Everyday' });
  await page.getByLabel('Statement CSV').setInputFiles(syntheticStatement);
  await page.getByRole('button', { name: 'Import' }).click();
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

test('imports a statement', async ({ page }, testInfo) => {
  await mockAccounts(page);
  await mockImport(page, 201, {
    import_id: 1,
    new_transaction_count: 12,
    existing_transaction_count: 3,
  });

  await submitStatement(page);

  await expect(page.getByRole('status')).toHaveText(
    /12 new transactions, 3 already imported\./,
  );
  await attachScreenshot(page, testInfo, 'import-complete');
});

test('rejects a file that was already imported', async ({ page }, testInfo) => {
  await mockAccounts(page);
  await mockImport(page, 409, {
    detail: 'This file has already been imported',
  });

  await submitStatement(page);

  await expect(page.getByRole('alert')).toHaveText(
    'This file has already been imported.',
  );
  await attachScreenshot(page, testInfo, 'import-duplicate');
});

test('shows statement validation errors', async ({ page }, testInfo) => {
  await mockAccounts(page);
  await mockImport(page, 400, {
    errors: [{ row_number: 4, message: 'Invalid amount' }],
  });

  await submitStatement(page);

  await expect(page.getByRole('listitem')).toHaveText('Row 4: Invalid amount');
  await attachScreenshot(page, testInfo, 'import-invalid');
});
