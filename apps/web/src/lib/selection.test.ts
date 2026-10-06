import { expect, test } from 'vitest';

import { toggleId } from './selection';

test('toggling an id adds it when missing and removes it when present', () => {
  const selections = [toggleId([1], 2), toggleId([1, 2], 1)];

  expect(selections).toEqual([[1, 2], [2]]);
});
