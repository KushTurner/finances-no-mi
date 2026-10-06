import { expect, test } from 'vitest';

import { compareTotals } from './comparison';

const covered = {
  previous: 10000,
  hasPrevious: true,
  covered: true,
  higherIsBetter: false,
  inPounds: false,
};

test('explains why a comparison cannot be shown yet', () => {
  const comparisons = [
    compareTotals({ ...covered, current: 12000, covered: false }),
    compareTotals({ ...covered, current: 12000, previous: undefined }),
    compareTotals({ ...covered, current: 12000, hasPrevious: false }),
    compareTotals({ ...covered, current: 12000, previous: 0 }),
  ];

  expect(comparisons.map((comparison) => comparison.kind)).toEqual([
    'not-enough-history',
    'comparing',
    'no-previous-transactions',
    'nothing-to-compare',
  ]);
});

test('spending more than before is an unfavourable percentage change', () => {
  const comparison = compareTotals({ ...covered, current: 12000 });

  expect(comparison).toEqual({
    kind: 'changed',
    more: true,
    favourable: false,
    differencePence: 2000,
    percent: 20,
  });
});

test('a change under half a percent, or under a pound for net, is about the same', () => {
  const comparisons = [
    compareTotals({ ...covered, current: 10040 }),
    compareTotals({
      ...covered,
      current: 10090,
      previous: 10000,
      inPounds: true,
    }),
  ];

  expect(comparisons.map((comparison) => comparison.kind)).toEqual([
    'about-the-same',
    'about-the-same',
  ]);
});

test('net compares in pounds even from zero', () => {
  const comparison = compareTotals({
    ...covered,
    current: 5000,
    previous: 0,
    higherIsBetter: true,
    inPounds: true,
  });

  expect(comparison).toMatchObject({
    kind: 'changed',
    more: true,
    favourable: true,
    differencePence: 5000,
  });
});
