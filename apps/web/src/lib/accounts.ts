import type { Summary } from '@/api';

import { toggleId } from './selection';

type Account = Summary['accounts'][number];

export function toggleAccountSelection(
  selectedIds: number[],
  id: number,
  accountCount: number,
) {
  const next = toggleId(selectedIds, id).sort((a, b) => a - b);
  return next.length === accountCount ? [] : next;
}

export function selectedAccounts(accounts: Account[], selectedIds: number[]) {
  return accounts.filter(
    (account) => selectedIds.length === 0 || selectedIds.includes(account.id),
  );
}

export function latestTransactionDate(accounts: Account[]) {
  return accounts
    .map((account) => account.latest_transaction_date)
    .filter((date) => date !== null)
    .sort()
    .at(-1);
}

export function hasHistorySince(accounts: Account[], date: string | null) {
  const earliest = accounts
    .map((account) => account.earliest_transaction_date)
    .filter((candidate) => candidate !== null)
    .sort()
    .at(0);
  return date !== null && earliest !== undefined && earliest <= date;
}
