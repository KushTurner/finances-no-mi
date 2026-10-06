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
  expect(
    screen.queryByRole('region', { name: 'Categorize selected transactions' }),
  ).toBeNull();
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
