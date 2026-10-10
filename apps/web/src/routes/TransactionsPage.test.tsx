import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { TransactionsPage } from './TransactionsPage';

afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TransactionsPage />
    </QueryClientProvider>,
  );
}

test('guides the user to import when there are no transactions', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json([]))),
  );

  renderPage();

  expect(
    await screen.findByText(
      'No transactions yet. Import a statement to get started.',
    ),
  ).toBeVisible();
});

test('recovers from a failed load with an explicit retry', async () => {
  let failing = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        failing ? new Response(null, { status: 500 }) : Response.json([]),
      ),
    ),
  );
  renderPage();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not load transactions',
  );
  failing = false;

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(
    await screen.findByText(
      'No transactions yet. Import a statement to get started.',
    ),
  ).toBeVisible();
});

test('search narrows the list to matching descriptions', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        Response.json(
          ['SYNTHETIC GROCER 1', 'SYNTHETIC CAFE', 'Synthetic Grocer 2'].map(
            (raw_description, index) => ({
              id: index + 1,
              account_name: 'Synthetic Bank',
              transaction_date: '2026-09-01',
              amount_pence: -100,
              raw_description,
              source_type: null,
            }),
          ),
        ),
      ),
    ),
  );
  renderPage();

  fireEvent.change(await screen.findByLabelText('Search descriptions'), {
    target: { value: 'grocer' },
  });

  expect(screen.getByText('2 of 3 transactions')).toBeVisible();
  expect(screen.queryByText('SYNTHETIC CAFE')).toBeNull();
});
