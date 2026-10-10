import { createRouter } from '@tanstack/react-router';

import { importRoute } from './importRoute';
import { moneyInRoute } from './moneyInRoute';
import { overviewRoute } from './overviewRoute';
import { rootRoute } from './rootRoute';
import { parseSearch, stringifySearch } from './searchParams';
import { transactionsRoute } from './transactionsRoute';

export const routeTree = rootRoute.addChildren([
  overviewRoute,
  transactionsRoute,
  moneyInRoute,
  importRoute,
]);

export const searchSerialization = { parseSearch, stringifySearch };

export const router = createRouter({ routeTree, ...searchSerialization });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
