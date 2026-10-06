import { expect, test } from 'vitest';

import { MASK, formatSignedPounds, moneyFormat, splitPence } from './money';

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

test('signed pounds show which way money moved, except for zero', () => {
  const formatted = [
    formatSignedPounds(2550),
    formatSignedPounds(-2550),
    formatSignedPounds(0),
  ];

  expect(formatted).toEqual(['+£25.50', '-£25.50', '£0.00']);
});

test('splits pence from the whole pounds so they can be styled apart', () => {
  const parts = [splitPence('£1,234.56'), splitPence(MASK)];

  expect(parts).toEqual([
    { whole: '£1,234', pence: '56' },
    { whole: MASK, pence: '' },
  ]);
});
