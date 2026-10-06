import { expect, test } from 'vitest';

import {
  MASK,
  axisTicks,
  formatRange,
  moneyFormat,
  percentChange,
  share,
} from './format';

test('formats pence as pounds, whole pounds, and compact axis labels', () => {
  const money = moneyFormat(false);

  const formatted = [
    money.pounds(123456),
    money.wholePounds(123456),
    money.compact(123456),
  ];

  expect(formatted).toEqual(['£1,234.56', '£1,235', '£1.2k']);
});

test('hidden amounts use one fixed mask that does not reveal their length', () => {
  const money = moneyFormat(true);

  const formatted = [
    money.pounds(450),
    money.wholePounds(12345678),
    money.compact(0),
  ];

  expect(formatted).toEqual([MASK, MASK, MASK]);
});

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
