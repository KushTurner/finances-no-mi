import { expect, test } from 'vitest';

import {
  hasHistorySince,
  latestTransactionDate,
  selectedAccounts,
  toggleAccountSelection,
} from './accounts';

function account(id: number, earliest: string | null, latest: string | null) {
  return {
    id,
    name: `Account ${id}`,
    spent_pence: 0,
    earliest_transaction_date: earliest,
    latest_transaction_date: latest,
  };
}

test('selecting every account one by one goes back to showing all accounts', () => {
  const selections = [
    toggleAccountSelection([], 3, 3),
    toggleAccountSelection([3], 1, 3),
    toggleAccountSelection([1, 3], 2, 3),
  ];

  expect(selections).toEqual([[3], [1, 3], []]);
});

test('no selection means every account is selected', () => {
  const accounts = [account(1, null, null), account(2, null, null)];

  const selected = [
    selectedAccounts(accounts, []),
    selectedAccounts(accounts, [2]),
  ];

  expect(selected.map((list) => list.map((item) => item.id))).toEqual([
    [1, 2],
    [2],
  ]);
});

test('the latest transaction is the most recent across accounts with history', () => {
  const accounts = [
    account(1, '2026-01-01', '2026-10-03'),
    account(2, null, null),
    account(3, '2026-02-01', '2026-10-05'),
  ];

  const latest = latestTransactionDate(accounts);

  expect(latest).toBe('2026-10-05');
});

test('history covers a date only when some account started on or before it', () => {
  const accounts = [
    account(1, '2026-03-01', '2026-10-03'),
    account(2, null, null),
  ];

  const covered = [
    hasHistorySince(accounts, '2026-03-01'),
    hasHistorySince(accounts, '2026-02-28'),
    hasHistorySince(accounts, null),
    hasHistorySince([account(3, null, null)], '2026-03-01'),
  ];

  expect(covered).toEqual([true, false, false, false]);
});
