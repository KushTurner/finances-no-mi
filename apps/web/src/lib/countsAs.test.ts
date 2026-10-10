import { expect, test } from 'vitest';

import { isCountsAs } from './countsAs';

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
