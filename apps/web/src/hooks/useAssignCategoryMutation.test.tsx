import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import { useAssignCategoryMutation } from './useAssignCategoryMutation';

afterEach(() => vi.unstubAllGlobals());

test('marks spending summaries out of date after assigning a category', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json({ updated_count: 1 }))),
  );
  const client = new QueryClient();
  const summaryKey = [
    'summary',
    'totals',
    { from: '2026-10-01', to: '2026-10-06' },
    [],
  ];
  client.setQueryData(summaryKey, { spent_pence: 1200 });
  const { result } = renderHook(() => useAssignCategoryMutation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

  await result.current.mutateAsync({ transaction_ids: [1], category_id: 2 });

  expect(client.getQueryState(summaryKey)?.isInvalidated).toBe(true);
});
