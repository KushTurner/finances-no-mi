import { expect, test } from 'vitest';

import { cn } from './utils';

test('theme tokens replace the shadcn defaults they conflict with', () => {
  const merged = [
    cn('text-sm text-muted-foreground', 'text-caption'),
    cn('shadow-sm', 'shadow-control'),
  ];

  expect(merged).toEqual([
    'text-muted-foreground text-caption',
    'shadow-control',
  ]);
});
