import { createRoute } from '@tanstack/react-router';

import { OverviewPage } from './OverviewPage';
import { rootRoute } from './rootRoute';
import { validateOverviewSearch } from './searchParams';

export const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateOverviewSearch,
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
