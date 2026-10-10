import { expect, test } from 'vitest';

import { selectAllState, toggleAll, toggleId } from './selection';

test('toggling an id adds it when missing and removes it when present', () => {
  const selections = [toggleId([1], 2), toggleId([1, 2], 1)];

  expect(selections).toEqual([[1, 2], [2]]);
});

test('select all is checked only when every shown transaction is selected', () => {
  const states = [
    selectAllState([1, 2], []),
    selectAllState([1, 2], [2]),
    selectAllState([1, 2], [1, 2]),
    selectAllState([], []),
  ];

  expect(states).toEqual([false, 'indeterminate', true, false]);
});

test('toggling all selects every shown transaction until all are selected', () => {
  const selections = [toggleAll([1, 2], [2]), toggleAll([1, 2], [1, 2])];

  expect(selections).toEqual([[1, 2], []]);
});
