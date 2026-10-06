import { createRoute } from '@tanstack/react-router';

import { OverviewPage } from './OverviewPage';
import { rootRoute } from './rootRoute';
import { validateOverviewSearch } from './searchParams';

export const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateOverviewSearch,
  component: OverviewPage,
});
