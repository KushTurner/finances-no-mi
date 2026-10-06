import {
  Outlet,
  Link,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { isPeriod } from './overview/periods';
import type { Period } from './overview/periods';

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
            activeOptions={{ exact: true, includeSearch: false }}
            activeProps={activeNavLink}
          >
            Overview
          </Link>
          <Link
            to="/transactions"
            className={navLink}
            activeOptions={{ includeSearch: false }}
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

type OverviewSearch = { period?: Period; accounts?: number[] };

function accountIdsFrom(value: unknown) {
  const candidates: unknown[] =
    typeof value === 'string'
      ? value.split(',').map(Number)
      : Array.isArray(value)
        ? value
        : [];
  const ids = candidates.filter(
    (id): id is number => Number.isInteger(id) && Number(id) > 0,
  );
  return ids.length > 0 ? ids : undefined;
}

function parseSearch(query: string) {
  return Object.fromEntries(new URLSearchParams(query));
}

function stringifySearch(search: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString().replaceAll('%2C', ',');
  return query ? `?${query}` : '';
}

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): OverviewSearch => ({
    period: isPeriod(search.period) ? search.period : undefined,
    accounts: accountIdsFrom(search.accounts),
  }),
  component: function OverviewRoute() {
    const search = overviewRoute.useSearch();
    const navigate = overviewRoute.useNavigate();
    return (
      <OverviewPage
        period={search.period ?? 'this_month'}
        accountIds={search.accounts ?? []}
        onPeriodChange={(period) =>
          void navigate({
            search: (current) => ({
              ...current,
              period: period === 'this_month' ? undefined : period,
            }),
            replace: true,
          })
        }
        onAccountsChange={(accounts) =>
          void navigate({
            search: (current) => ({
              ...current,
              accounts: accounts.length > 0 ? accounts : undefined,
            }),
            replace: true,
          })
        }
      />
    );
  },
});

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  validateSearch: (search: Record<string, unknown>): { category?: string } => ({
    category: typeof search.category === 'string' ? search.category : undefined,
  }),
  component: function TransactionsRoute() {
    const { category } = transactionsRoute.useSearch();
    return <TransactionsPage key={category} initialFilter={category} />;
  },
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: ImportPage,
});

export const routeTree = rootRoute.addChildren([
  overviewRoute,
  transactionsRoute,
  importRoute,
]);

export const searchSerialization = { parseSearch, stringifySearch };

export const router = createRouter({ routeTree, ...searchSerialization });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
