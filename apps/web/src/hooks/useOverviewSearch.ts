import { getRouteApi } from '@tanstack/react-router';

import type { Period } from '@/lib';

const overviewRoute = getRouteApi('/');

export function useOverviewSearch() {
  const search = overviewRoute.useSearch();
  const navigate = overviewRoute.useNavigate();

  function setPeriod(period: Period) {
    void navigate({
      search: (current) => ({
        ...current,
        period: period === 'this_month' ? undefined : period,
      }),
      replace: true,
    });
  }

  function setAccountIds(accountIds: number[]) {
    void navigate({
      search: (current) => ({
        ...current,
        accounts: accountIds.length > 0 ? accountIds : undefined,
      }),
      replace: true,
    });
  }

  return {
    period: search.period ?? 'this_month',
    accountIds: search.accounts ?? [],
    setPeriod,
    setAccountIds,
  };
}
