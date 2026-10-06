import { expect, test } from 'vitest';

import {
  axisTicks,
  formatChartMonth,
  formatCount,
  formatRange,
  formatShownRange,
  percentChange,
  share,
} from './format';

test('shortens a range to the parts that differ', () => {
  const ranges = [
    formatRange('2026-10-01', '2026-10-03'),
    formatRange('2026-07-09', '2026-10-06'),
    formatRange('2025-10-07', '2026-10-06'),
  ];

  expect(ranges).toEqual([
    '1 – 3 Oct 2026',
    '9 Jul – 6 Oct 2026',
    '7 Oct 2025 – 6 Oct 2026',
  ]);
});

test('a change from zero has no percentage', () => {
  const changes = [percentChange(110, 100), percentChange(50, 0)];

  expect(changes).toEqual([10, null]);
});

test('axis ticks step in round amounts up to the largest value', () => {
  const ticks = [axisTicks(255000), axisTicks(134400), axisTicks(0)];

  expect(ticks).toEqual([
    [0, 100000, 200000, 300000],
    [0, 50000, 100000, 150000],
    [0, 25, 50, 75, 100],
  ]);
});

test('a share too small to round to a percent still shows as present', () => {
  const shares = [share(82, 25118), share(0, 25118), share(2500, 10000)];

  expect(shares).toEqual(['<1%', '0%', '25%']);
});

test('counts use the singular only for one', () => {
  const counts = [
    formatCount(1, 'transaction'),
    formatCount(0, 'transaction'),
    formatCount(3, 'complete month'),
  ];

  expect(counts).toEqual([
    '1 transaction',
    '0 transactions',
    '3 complete months',
  ]);
});

test('a range ending before the requested end is marked as up to the latest transaction', () => {
  const ranges = [
    formatShownRange('2026-10-01', '2026-10-03', '2026-10-06'),
    formatShownRange('2026-10-01', '2026-10-06', '2026-10-06'),
  ];

  expect(ranges).toEqual([
    '1 – 3 Oct 2026 · up to your latest transaction',
    '1 – 6 Oct 2026',
  ]);
});

test('chart months say when they are incomplete', () => {
  const titles = [
    formatChartMonth('2026-09', true),
    formatChartMonth('2026-10', false),
  ];

  expect(titles).toEqual(['September 2026', 'October 2026 (incomplete)']);
});
