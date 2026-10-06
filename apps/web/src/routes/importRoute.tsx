import { createRoute } from '@tanstack/react-router';

import { ImportPage } from './ImportPage';
import { rootRoute } from './rootRoute';

export const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: ImportPage,
});
