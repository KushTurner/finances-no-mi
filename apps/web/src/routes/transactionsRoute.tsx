import { createRoute } from '@tanstack/react-router';

import { rootRoute } from './rootRoute';
import { TransactionsPage } from './TransactionsPage';

export const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: TransactionsPage,
});
