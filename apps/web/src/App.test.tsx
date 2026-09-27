import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { App } from './App';

test('renders the application identity', () => {
  render(<App />);

  const heading = screen.getByRole('heading', { name: 'Finances No MI' });

  expect(heading).toBeInTheDocument();
});
