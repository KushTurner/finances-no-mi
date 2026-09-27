import {
  Outlet,
  Link,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { ImportPage } from './ImportPage';
import { OverviewPage } from './OverviewPage';
import { TransactionsPage } from './TransactionsPage';

const navLink =
  'rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground';
const activeNavLink = {
  className: 'bg-secondary font-medium text-foreground',
};

const rootRoute = createRootRoute({
  component: () => (
    <>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-7">
        <Link to="/" className="flex items-center gap-2.5 font-semibold">
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-[#3a3a3c] to-[#1d1d1f] text-xs font-bold"
          >
            £
          </span>
          Finances
        </Link>
        <nav aria-label="Main navigation" className="flex gap-1">
          <Link
            to="/"
            className={navLink}
            activeOptions={{ exact: true }}
            activeProps={activeNavLink}
          >
            Overview
          </Link>
          <Link
            to="/transactions"
            className={navLink}
            activeProps={activeNavLink}
          >
            Transactions
          </Link>
          <Link to="/import" className={navLink} activeProps={activeNavLink}>
            Import
          </Link>
        </nav>
      </header>
      <Outlet />
    </>
  ),
});

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: OverviewPage,
});

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: TransactionsPage,
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: ImportPage,
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  transactionsRoute,
  importRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
