import { expect, test } from 'vitest';

import type { MonthlySummary, Summary } from '@/api';

import {
  categorySpendingRows,
  incomeAndSpendingChart,
  monthlySpendingChart,
  spendingPace,
  uncategorizedLabel,
} from './spending';

function summary(overrides: Partial<Summary>): Summary {
  return {
    start: '2026-10-01',
    end: '2026-10-06',
    transaction_count: 3,
    spent_pence: 0,
    income_pence: 0,
    savings_pence: 0,
    net_pence: 0,
    uncategorized: {
      outgoing_count: 0,
      outgoing_pence: 0,
      incoming_count: 0,
      incoming_pence: 0,
    },
    categories: [],
    accounts: [],
    largest_payments: [],
    ...overrides,
  };
}

function day(running: number) {
  return { date: '2026-10-01', spent_pence: 0, running_spent_pence: running };
}

const months: MonthlySummary = {
  months: [
    {
      month: '2026-08',
      spent_pence: 40000,
      income_pence: 90000,
      complete: true,
    },
    {
      month: '2026-09',
      spent_pence: 60000,
      income_pence: 90000,
      complete: true,
    },
    { month: '2026-10', spent_pence: 10000, income_pence: 0, complete: false },
  ],
  average_spent_pence: 50000,
  kept_pence: 80000,
};

test('uncategorized spending comes last and bars scale to the largest category', () => {
  const rows = categorySpendingRows(
    summary({
      categories: [
        { id: 1, name: 'Food', spent_pence: 20000 },
        { id: 2, name: 'Other', spent_pence: 5000 },
      ],
      uncategorized: {
        outgoing_count: 1,
        outgoing_pence: 10000,
        incoming_count: 0,
        incoming_pence: 0,
      },
    }),
  );

  expect(rows.map((row) => [row.name, row.barPercent, row.muted])).toEqual([
    ['Food', 100, false],
    ['Other', 25, false],
    [uncategorizedLabel, 50, true],
  ]);
});

test('a net refund in a category draws no bar', () => {
  const rows = categorySpendingRows(
    summary({ categories: [{ id: 1, name: 'Shopping', spent_pence: -500 }] }),
  );

  expect(rows[0].barPercent).toBe(0);
});

test('monthly spending highlights the months in the selected period', () => {
  const chart = monthlySpendingChart(months, {
    from: '2026-09-15',
    to: '2026-10-06',
  });

  expect(chart.rows.map((row) => [row.label, row.highlighted])).toEqual([
    ['Aug', false],
    ['Sep', true],
    ['Oct', true],
  ]);
});

test('income and spending counts only complete months', () => {
  const chart = incomeAndSpendingChart(months);

  expect(chart.completeMonths).toBe(2);
});

test('spending pace compares running totals on the same day of each month', () => {
  const pace = spendingPace(
    [day(1000), day(3000)],
    [day(500), day(2500), day(9000)],
  );

  expect({ sameDay: pace.sameDay, difference: pace.difference }).toEqual({
    sameDay: 2,
    difference: 500,
  });
});

test('spending pace leaves days missing from the shorter month empty', () => {
  const pace = spendingPace([day(1000)], [day(500), day(2500)]);

  expect(pace.rows).toEqual([
    { day: 1, current: 1000, previous: 500 },
    { day: 2, current: undefined, previous: 2500 },
  ]);
});
