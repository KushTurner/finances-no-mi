import { expect, test } from 'vitest';

import {
  parseSearch,
  stringifySearch,
  validateOverviewSearch,
} from './searchParams';

test('keeps only known periods and positive whole account ids', () => {
  const searches = [
    validateOverviewSearch(parseSearch('?period=last_month&accounts=2,0,x,3')),
    validateOverviewSearch(parseSearch('?period=forever&accounts=-1')),
  ];

  expect(searches).toEqual([
    { period: 'last_month', accounts: [2, 3] },
    { period: undefined, accounts: undefined },
  ]);
});

test('writes account ids as a readable comma list and drops empty values', () => {
  const query = stringifySearch({
    period: 'last_90_days',
    accounts: [1, 3],
    category: undefined,
  });

  expect(query).toBe('?period=last_90_days&accounts=1,3');
});
