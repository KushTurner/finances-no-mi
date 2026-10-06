import { isPeriod } from '@/lib';
import type { Period } from '@/lib';

export type OverviewSearch = { period?: Period; accounts?: number[] };

export type TransactionsSearch = { category?: string };

function accountIdsFrom(value: unknown) {
  const candidates: unknown[] =
    typeof value === 'string'
      ? value.split(',').map(Number)
      : Array.isArray(value)
        ? value
        : [];
  const ids = candidates.filter(
    (id): id is number => Number.isInteger(id) && Number(id) > 0,
  );
  return ids.length > 0 ? ids : undefined;
}

export function validateOverviewSearch(
  search: Record<string, unknown>,
): OverviewSearch {
  return {
    period: isPeriod(search.period) ? search.period : undefined,
    accounts: accountIdsFrom(search.accounts),
  };
}

export function validateTransactionsSearch(
  search: Record<string, unknown>,
): TransactionsSearch {
  return {
    category: typeof search.category === 'string' ? search.category : undefined,
  };
}

export function parseSearch(query: string) {
  return Object.fromEntries(new URLSearchParams(query));
}

export function stringifySearch(search: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString().replaceAll('%2C', ',');
  return query ? `?${query}` : '';
}
