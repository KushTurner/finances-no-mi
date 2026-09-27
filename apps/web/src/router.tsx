import {
  Outlet,
  Link,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { ImportPage } from './ImportPage';
import { TransactionsPage } from './TransactionsPage';

const rootRoute = createRootRoute({
  component: () => (
    <>
      <nav
        aria-label="Main navigation"
        className="flex gap-6 border-b border-slate-200 bg-white px-6 py-4 text-sm font-medium"
      >
        <Link
          to="/"
          activeOptions={{ exact: true }}
          activeProps={{ className: 'underline underline-offset-4' }}
        >
          Import statements
        </Link>
        <Link
          to="/transactions"
          activeProps={{ className: 'underline underline-offset-4' }}
        >
          Transactions
        </Link>
      </nav>
      <Outlet />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ImportPage,
});

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: TransactionsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, transactionsRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
