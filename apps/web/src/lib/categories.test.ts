import { expect, test } from 'vitest';

import { categoryName } from './categories';

test('a transaction without a known category is uncategorized', () => {
  const categories = [{ id: 1, name: 'Groceries', definition: 'Food shops' }];

  const names = [categoryName(categories, 1), categoryName(categories, null)];

  expect(names).toEqual(['Groceries', 'Uncategorized']);
});
