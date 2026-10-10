import { expect, test } from 'vitest';

import type { Transaction } from '@/api';

import { emptyTransactionsMessage, filterByDescription } from './transactions';

function transaction(id: number, raw_description: string): Transaction {
  return {
    id,
    account_name: 'Synthetic Bank',
    transaction_date: '2026-09-01',
    amount_pence: -100,
    raw_description,
    source_type: null,
    counts_as: null,
    counts_as_source: null,
  };
}

const transactions = [
  transaction(1, 'SYNTHETIC GROCER   STORE 12'),
  transaction(2, 'Synthetic Grocer Express'),
  transaction(3, 'SYNTHETIC CAFE'),
];

test('search matches descriptions ignoring case and repeated spaces', () => {
  const matches = filterByDescription(transactions, ' grocer  store ');

  expect(matches.map((match) => match.id)).toEqual([1]);
});

test('a blank search keeps every transaction', () => {
  const matches = filterByDescription(transactions, '   ');

  expect(matches).toBe(transactions);
});

test('the empty message explains whether the search found nothing', () => {
  const messages = [
    emptyTransactionsMessage(' grocer '),
    emptyTransactionsMessage(''),
  ];

  expect(messages).toEqual([
    'No transactions match “grocer”.',
    'No transactions yet. Import a statement to get started.',
  ]);
});
