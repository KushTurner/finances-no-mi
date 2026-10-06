import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import { useImportStatementMutation } from './useImportStatementMutation';

afterEach(() => vi.unstubAllGlobals());

test('marks transactions out of date after importing a statement', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        Response.json(
          {
            import_id: 1,
            account_name: 'NatWest',
            new_transaction_count: 12,
            existing_transaction_count: 0,
          },
          { status: 201 },
        ),
      ),
    ),
  );
  const client = new QueryClient();
  client.setQueryData(['transactions', 'all'], []);
  const { result } = renderHook(() => useImportStatementMutation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

  await result.current.mutateAsync(new File(['Date\n'], 'natwest.csv'));

  expect(client.getQueryState(['transactions', 'all'])?.isInvalidated).toBe(
    true,
  );
});
