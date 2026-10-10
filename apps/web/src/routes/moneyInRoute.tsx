import { createRoute } from '@tanstack/react-router';

import { MoneyInPage } from './MoneyInPage';
import { rootRoute } from './rootRoute';

export const moneyInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/money-in',
  component: MoneyInPage,
});
