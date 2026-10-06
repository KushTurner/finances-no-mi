import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { routeTree, searchSerialization } from './router';

const summary = {
  start: '2026-10-01',
  end: '2026-10-03',
  transaction_count: 4,
  spent_pence: 125000,
  income_pence: 320000,
  net_pence: 195000,
  uncategorized: {
    outgoing_count: 0,
    outgoing_pence: 0,
    incoming_count: 0,
    incoming_pence: 0,
  },
  categories: [{ id: 1, name: 'Home & bills', spent_pence: 125000 }],
  accounts: [
    {
      id: 1,
      name: 'NatWest',
      spent_pence: 125000,
      earliest_transaction_date: '2026-01-05',
      latest_transaction_date: '2026-10-03',
    },
  ],
  largest_payments: [],
};

let requests: URL[] = [];

beforeEach(() => {
  requests = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const url = new URL(input, 'http://localhost');
      requests.push(url);
      if (url.pathname.endsWith('/months')) {
        return Promise.resolve(
          Response.json({ months: [], average_spent_pence: 0, kept_pence: 0 }),
        );
      }
      if (url.pathname.endsWith('/days')) {
        return Promise.resolve(Response.json([]));
      }
      return Promise.resolve(Response.json(summary));
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderOverview(path: string) {
  const router = createRouter({
    routeTree,
    ...searchSerialization,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function summaryRanges() {
  return requests
    .filter((url) => url.pathname === '/api/summary')
    .map(
      (url) => `${url.searchParams.get('from')}..${url.searchParams.get('to')}`,
    );
}

test('a month still in progress is not compared with an earlier period', async () => {
  renderOverview('/');

  expect(await screen.findByRole('region', { name: 'Totals' })).toBeVisible();
  expect(summaryRanges()).toEqual(['2026-10-01..2026-10-06']);
});

test('last month is compared with the month before it', async () => {
  renderOverview('/?period=last_month');

  expect(await screen.findByRole('region', { name: 'Totals' })).toBeVisible();
  expect(summaryRanges()).toEqual([
    '2026-09-01..2026-09-30',
    '2026-08-01..2026-08-31',
  ]);
});

test('hiding amounts masks every total and is remembered for the next visit', async () => {
  renderOverview('/');
  const totals = await screen.findByRole('region', { name: 'Totals' });

  fireEvent.click(screen.getByRole('button', { name: 'Hide amounts' }));

  expect(totals).not.toHaveTextContent(/£\d/);
  expect(localStorage.getItem('overview-hide-amounts')).toBe('true');
});
