import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import type { Account } from './api';
import { ImportPage } from './ImportPage';

const currentAccount: Account = {
  id: 1,
  name: 'Everyday',
  institution: 'natwest',
  account_type: 'current_account',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubApi(accounts: Account[], importResponse?: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        url === '/api/accounts' ? Response.json(accounts) : importResponse,
      ),
    ),
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

async function submitStatement() {
  fireEvent.change(await screen.findByLabelText('Account'), {
    target: { value: String(currentAccount.id) },
  });
  fireEvent.change(screen.getByLabelText('Statement CSV'), {
    target: {
      files: [new File(['Date,Description\n'], 'statement.csv')],
    },
  });
  fireEvent.submit(screen.getByRole('form', { name: 'Import statement' }));
}

test('shows new and existing transaction counts after an import', async () => {
  stubApi(
    [currentAccount],
    Response.json(
      {
        import_id: 7,
        new_transaction_count: 12,
        existing_transaction_count: 3,
      },
      { status: 201 },
    ),
  );
  renderImportPage();

  await submitStatement();

  expect(await screen.findByRole('status')).toHaveTextContent(
    '12 new transactions, 3 already imported.',
  );
});

test('reports a file that has already been imported', async () => {
  stubApi(
    [currentAccount],
    Response.json({ detail: 'duplicate' }, { status: 409 }),
  );
  renderImportPage();

  await submitStatement();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This file has already been imported.',
  );
});

test('lists validation errors with their row numbers', async () => {
  stubApi(
    [currentAccount],
    Response.json(
      {
        errors: [
          { row_number: null, message: 'Missing Balance column' },
          { row_number: 4, message: 'Invalid amount' },
        ],
      },
      { status: 400 },
    ),
  );
  renderImportPage();

  await submitStatement();

  const errors = await screen.findAllByRole('listitem');
  expect(errors.map((error) => error.textContent)).toEqual([
    'Missing Balance column',
    'Row 4: Invalid amount',
  ]);
});

test('explains that an account is needed before importing', async () => {
  stubApi([]);

  renderImportPage();

  expect(
    await screen.findByText(
      'No accounts yet. Create one through the API before importing.',
    ),
  ).toBeInTheDocument();
});
