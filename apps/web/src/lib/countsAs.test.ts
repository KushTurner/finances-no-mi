import { expect, test } from 'vitest';

import { countsAsLabel, isCountsAs } from './countsAs';

test('only the three choices count as a mark', () => {
  const checks = [
    'income',
    'repayment',
    'own_account',
    'unset',
    'toString',
  ].map(isCountsAs);

  expect(checks).toEqual([true, true, true, false, false]);
});

test('an unmarked transaction counts by direction and a mark shows its label', () => {
  const base = {
    id: 1,
    account_name: 'Synthetic Bank',
    transaction_date: '2026-09-01',
    raw_description: 'SYNTHETIC SHOP',
    source_type: null,
    counts_as_source: null,
  };

  const labels = [
    countsAsLabel({ ...base, amount_pence: -100, counts_as: null }),
    countsAsLabel({ ...base, amount_pence: 100, counts_as: null }),
    countsAsLabel({ ...base, amount_pence: -100, counts_as: 'savings' }),
  ];

  expect(labels).toEqual(['Spending', 'Income', 'Savings & investments']);
});
