import { expect, test } from 'vitest';

import {
  chartMonths,
  comparisonLabel,
  comparisonRange,
  localToday,
  monthOverlaps,
  paceRanges,
  periodRange,
} from './periods';

test('this month and this year run from the calendar start to today', () => {
  const today = '2026-10-06';

  const ranges = [
    periodRange('this_month', today),
    periodRange('this_year', today),
  ];

  expect(ranges).toEqual([
    { from: '2026-10-01', to: '2026-10-06' },
    { from: '2026-01-01', to: '2026-10-06' },
  ]);
});

test('last month is the whole previous calendar month, across a year end', () => {
  const range = periodRange('last_month', '2026-01-15');

  expect(range).toEqual({ from: '2025-12-01', to: '2025-12-31' });
});

test('rolling periods end today and include today', () => {
  const today = '2026-10-06';

  const ranges = [
    periodRange('last_90_days', today),
    periodRange('last_12_months', today),
  ];

  expect(ranges).toEqual([
    { from: '2026-07-09', to: '2026-10-06' },
    { from: '2025-10-07', to: '2026-10-06' },
  ]);
});

test('complete periods compare with the period of the same shape before them', () => {
  const today = '2026-03-31';

  const comparisons = (
    ['last_month', 'last_90_days', 'last_12_months'] as const
  ).map((period) => comparisonRange(period, periodRange(period, today)));

  expect(comparisons).toEqual([
    { from: '2026-01-01', to: '2026-01-31' },
    { from: '2025-10-03', to: '2025-12-31' },
    { from: '2024-04-01', to: '2025-03-31' },
  ]);
});

test('periods still in progress have no comparison', () => {
  const today = '2026-10-06';

  const comparisons = (['this_month', 'this_year'] as const).map((period) =>
    comparisonRange(period, periodRange(period, today)),
  );

  expect(comparisons).toEqual([null, null]);
});

test('charts cover the twelve months ending with the period end', () => {
  const months = chartMonths('2026-10-03');

  expect(months).toEqual({ from: '2025-11', to: '2026-10' });
});

test('spending pace compares the month so far with the whole previous month', () => {
  const ranges = paceRanges('2026-03-03');

  expect(ranges).toEqual({
    current: { from: '2026-03-01', to: '2026-03-03' },
    previous: { from: '2026-02-01', to: '2026-02-28' },
  });
});

test('a month is highlighted when any of its days fall in the period', () => {
  const range = { from: '2026-07-09', to: '2026-10-03' };

  const highlighted = ['2026-06', '2026-07', '2026-10'].map((month) =>
    monthOverlaps(month, range),
  );

  expect(highlighted).toEqual([false, true, true]);
});

test('today follows the local calendar date', () => {
  const today = localToday(new Date(2026, 9, 6, 23, 30));

  expect(today).toBe('2026-10-06');
});

test('comparison labels name the previous month or the length of the period', () => {
  const labels = [
    comparisonLabel('last_month', { from: '2026-08-01', to: '2026-08-31' }),
    comparisonLabel('last_90_days', { from: '2026-04-09', to: '2026-07-08' }),
    comparisonLabel('last_12_months', { from: '2024-10-07', to: '2025-10-06' }),
  ];

  expect(labels).toEqual([
    'August',
    'the previous 90 days',
    'the previous 12 months',
  ]);
});
