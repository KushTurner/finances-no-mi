import { expect, test } from 'vitest';

import type { MonthlySummary } from '@/api';

import {
  incomeAndSpendingChart,
  monthlySpendingChart,
  spendingPace,
} from './spending';

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
