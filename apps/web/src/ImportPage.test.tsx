import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import type { Account, Institution } from './api';
import { ImportPage } from './ImportPage';

const everyday: Account = {
  id: 1,
  name: 'Everyday',
  institution: 'natwest',
  account_type: 'current_account',
};

const card: Account = {
  id: 2,
  name: 'Card',
  institution: 'amex',
  account_type: 'credit_card',
};

type ApiStub = {
  accounts: Account[];
  institutions?: Record<string, Institution | null>;
  importResponses?: Record<number, () => Response>;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubApi({
  accounts,
  institutions = {},
  importResponses = {},
}: ApiStub) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/accounts') {
        return Promise.resolve(Response.json(accounts));
      }
      if (url === '/api/statements/institution') {
        const file = (init?.body as FormData).get('file') as File;
        return Promise.resolve(
          Response.json({ institution: institutions[file.name] ?? null }),
        );
      }
      const accountId = Number(url.split('/')[3]);
      return Promise.resolve(importResponses[accountId]());
    }),
  );
}

function renderImportPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ImportPage />
    </QueryClientProvider>,
  );
}

async function dropStatements(...names: string[]) {
  const files = names.map((name) => new File(['Date\n'], name));
  fireEvent.drop(await screen.findByLabelText(/Drop statement CSVs/), {
    dataTransfer: { files },
  });
}

async function importStatements(buttonName: string) {
  fireEvent.click(await screen.findByRole('button', { name: buttonName }));
}

function statementRow(name: string) {
  return within(screen.getByRole('listitem', { name }));
}

test('selects the account at the bank each dropped statement came from', async () => {
  stubApi({
    accounts: [everyday, card],
    institutions: { 'natwest.csv': 'natwest', 'amex.csv': 'amex' },
  });
  renderImportPage();

  await dropStatements('natwest.csv', 'amex.csv');

  expect(
    await screen.findByRole('combobox', { name: 'Account for natwest.csv' }),
  ).toHaveDisplayValue('Everyday');
  expect(
    await screen.findByRole('combobox', { name: 'Account for amex.csv' }),
  ).toHaveDisplayValue('Card');
});

test('imports each statement into its account and shows each outcome', async () => {
  stubApi({
    accounts: [everyday, card],
    institutions: { 'natwest.csv': 'natwest', 'amex.csv': 'amex' },
    importResponses: {
      1: () =>
        Response.json(
          {
            import_id: 7,
            new_transaction_count: 12,
            existing_transaction_count: 3,
          },
          { status: 201 },
        ),
      2: () => Response.json({ detail: 'duplicate' }, { status: 409 }),
    },
  });
  renderImportPage();
  await dropStatements('natwest.csv', 'amex.csv');

  await importStatements('Import 2 statements');

  expect(
    await statementRow('natwest.csv').findByRole('status'),
  ).toHaveTextContent('Imported: 12 new transactions, 3 already imported.');
  expect(await statementRow('amex.csv').findByRole('alert')).toHaveTextContent(
    'This file has already been imported.',
  );
});

test('lists validation errors with their row numbers', async () => {
  stubApi({
    accounts: [everyday],
    institutions: { 'natwest.csv': 'natwest' },
    importResponses: {
      1: () =>
        Response.json(
          {
            errors: [
              { row_number: null, message: 'Missing Balance column' },
              { row_number: 4, message: 'Invalid amount' },
            ],
          },
          { status: 400 },
        ),
    },
  });
  renderImportPage();
  await dropStatements('natwest.csv');

  await importStatements('Import 1 statement');

  const errors = await statementRow('natwest.csv').findAllByRole('listitem');
  expect(errors.map((error) => error.textContent)).toEqual([
    'Missing Balance column',
    'Row 4: Invalid amount',
  ]);
});

test('reports a file that is not a supported statement', async () => {
  stubApi({ accounts: [everyday] });
  renderImportPage();

  await dropStatements('notes.csv');

  expect(await statementRow('notes.csv').findByRole('alert')).toHaveTextContent(
    'Not a supported Amex, NatWest, or Nationwide statement.',
  );
});

test('waits for an account choice when several accounts share a bank', async () => {
  const savings: Account = { ...everyday, id: 3, name: 'Savings' };
  stubApi({
    accounts: [everyday, savings],
    institutions: { 'natwest.csv': 'natwest' },
  });
  renderImportPage();

  await dropStatements('natwest.csv');

  expect(
    await screen.findByRole('combobox', { name: 'Account for natwest.csv' }),
  ).toHaveDisplayValue('Select an account');
  expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
});

test('explains that an account is needed before importing', async () => {
  stubApi({ accounts: [] });

  renderImportPage();

  expect(
    await screen.findByText(
      'No accounts yet. Create one through the API before importing.',
    ),
  ).toBeInTheDocument();
});
