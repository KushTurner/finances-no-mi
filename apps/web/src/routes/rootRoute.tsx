import { Outlet, createRootRoute } from '@tanstack/react-router';

import { AppHeader } from '@/components/common';

export const rootRoute = createRootRoute({
  component: () => (
    <>
      <AppHeader />
      <Outlet />
    </>
  ),
});
