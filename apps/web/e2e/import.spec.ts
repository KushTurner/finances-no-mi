/// <reference lib="dom" />

import type { Page } from '@playwright/test';

import { attachScreenshot, expect, test } from './fixtures';

test.use({ deviceScaleFactor: 2 });

type MockResponse = { status: number; json: unknown };
type ImportResponder = (form: string) => MockResponse;

const presets = [
  {
    id: 'amex_gold',
    name: 'American Express Gold',
    institution: 'amex',
    account_type: 'credit_card',
    card_type: 'credit',
  },
  {
    id: 'nationwide_flexone',
    name: 'Nationwide FlexOne',
    institution: 'nationwide',
    account_type: 'current_account',
    card_type: 'debit',
  },
  {
    id: 'natwest_select',
    name: 'NatWest Select',
    institution: 'natwest',
    account_type: 'current_account',
    card_type: 'debit',
  },
];

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

const needsAccount: MockResponse = {
  status: 422,
  json: { detail: 'Add an account for this statement', card_type: 'debit' },
};

function syntheticStatement(name: string) {
  return {
    name,
    mimeType: 'application/x-ofx',
    buffer: Buffer.from('<OFX></OFX>'),
  };
}

async function mockApi(
  page: Page,
  respondersByFilename: Record<string, ImportResponder>,
) {
  await page.route('**/api/account-presets', (route) =>
    route.fulfill({ json: presets }),
  );
  await page.route('**/api/imports', (route) => {
    const form = route.request().postData() ?? '';
    const filename = /filename="([^"]+)"/.exec(form)?.[1] ?? '';
    return route.fulfill(respondersByFilename[filename](form));
  });
}

test('imports dropped statements into their matching accounts', async ({
  page,
}, testInfo) => {
  await mockApi(page, {
    'natwest.ofx': () => completed('NatWest Select'),
    'amex.ofx': () => completed('American Express Gold'),
  });
  await page.goto('/import');
  await attachScreenshot(page, testInfo, 'import-empty');
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    for (const name of ['natwest.ofx', 'amex.ofx']) {
      transfer.items.add(new File(['<OFX>'], name));
    }
    return transfer;
  });

  await page
    .getByText('Drop OFX statements here')
    .dispatchEvent('drop', { dataTransfer });
  await expect(
    page.getByRole('listitem', { name: 'natwest.ofx' }),
  ).toContainText('Ready to import');
  await attachScreenshot(page, testInfo, 'statements-queued');
  await page.getByRole('button', { name: 'Import 2 statements' }).click();

  await expect(
    page.getByRole('listitem', { name: 'amex.ofx' }).getByRole('status'),
  ).toHaveText(
    'Imported into American Express Gold: 12 new transactions, 3 already imported.',
  );
  await expect(page.getByRole('button', { name: /^Import/ })).toHaveCount(0);
  await attachScreenshot(page, testInfo, 'dropped-statements-imported');
});

test('shows the outcome of each chosen statement', async ({
  page,
}, testInfo) => {
  await mockApi(page, {
    'natwest.ofx': () => completed('NatWest Select'),
    'amex.ofx': () => ({
      status: 409,
      json: { detail: 'This file has already been imported' },
    }),
    'nationwide.ofx': () => ({
      status: 400,
      json: { errors: [{ position: 4, message: 'FITID is required' }] },
    }),
    'notes.ofx': () => ({
      status: 400,
      json: {
        errors: [
          { position: null, message: 'File is not a readable OFX statement' },
        ],
      },
    }),
  });
  await page.goto('/import');

  await page
    .getByLabel(/Drop OFX statements/)
    .setInputFiles(
      ['natwest.ofx', 'amex.ofx', 'nationwide.ofx', 'notes.ofx'].map(
        syntheticStatement,
      ),
    );
  await page.getByRole('button', { name: 'Import 4 statements' }).click();

  await expect(page.getByRole('listitem', { name: 'notes.ofx' })).toContainText(
    'File is not a readable OFX statement',
  );
  await expect(
    page.getByRole('listitem', { name: 'nationwide.ofx' }),
  ).toContainText('Transaction 4: FITID is required');
  await expect(page.getByRole('listitem', { name: 'amex.ofx' })).toContainText(
    'This file has already been imported.',
  );
  await attachScreenshot(page, testInfo, 'statement-outcomes');
});

for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`adds an account for an unmatched statement on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    let accountAdded = false;
    await mockApi(page, {
      'september.ofx': (form) => {
        accountAdded = form.includes('name="preset"');
        return accountAdded ? completed('Bills') : needsAccount;
      },
      'october.ofx': () => (accountAdded ? completed('Bills') : needsAccount),
    });
    await page.setViewportSize(viewport);
    await page.goto('/import');
    await page
      .getByLabel(/Drop OFX statements/)
      .setInputFiles(['september.ofx', 'october.ofx'].map(syntheticStatement));
    await page.getByRole('button', { name: 'Import 2 statements' }).click();
    const september = page.getByRole('listitem', { name: 'september.ofx' });
    await expect(
      september.getByRole('radio', { name: 'NatWest Select' }),
    ).toBeVisible();
    await expect(
      page.getByRole('listitem', { name: 'october.ofx' }),
    ).toContainText('Add the account for the statement above first.');
    await attachScreenshot(page, testInfo, `account-setup-${viewport.name}`);
    await september.getByRole('radio', { name: 'NatWest Select' }).check();
    await september.getByLabel('Name (optional)').fill('Bills');
    await attachScreenshot(
      page,
      testInfo,
      `account-setup-filled-${viewport.name}`,
    );

    await september
      .getByRole('button', { name: 'Add account and import' })
      .click();

    await expect(
      page.getByRole('listitem', { name: 'october.ofx' }).getByRole('status'),
    ).toHaveText(
      'Imported into Bills: 12 new transactions, 3 already imported.',
    );
    await attachScreenshot(
      page,
      testInfo,
      `account-setup-imported-${viewport.name}`,
    );
  });
}

test('offers only credit cards for a credit card statement', async ({
  page,
}, testInfo) => {
  await mockApi(page, {
    'amex.ofx': () => ({
      status: 422,
      json: {
        detail: 'Add an account for this statement',
        card_type: 'credit',
      },
    }),
  });
  await page.goto('/import');
  await page
    .getByLabel(/Drop OFX statements/)
    .setInputFiles([syntheticStatement('amex.ofx')]);

  await page.getByRole('button', { name: 'Import 1 statement' }).click();

  const statement = page.getByRole('listitem', { name: 'amex.ofx' });
  await expect(statement.getByRole('radio')).toHaveCount(1);
  await expect(
    statement.getByRole('radio', { name: 'American Express Gold' }),
  ).not.toBeChecked();
  await attachScreenshot(page, testInfo, 'account-setup-credit');
});
