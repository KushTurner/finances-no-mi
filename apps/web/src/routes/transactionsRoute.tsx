import { createRoute } from '@tanstack/react-router';

import { rootRoute } from './rootRoute';
import { validateTransactionsSearch } from './searchParams';
import { TransactionsPage } from './TransactionsPage';

export const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  validateSearch: validateTransactionsSearch,
  component: function TransactionsRoute() {
    const { category } = transactionsRoute.useSearch();
    return <TransactionsPage key={category} initialFilter={category} />;
  },
});
