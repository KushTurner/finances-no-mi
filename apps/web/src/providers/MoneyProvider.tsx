import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { useHiddenAmounts } from '@/hooks';
import { moneyFormat } from '@/lib';

import { MoneyContext } from './moneyContext';

type MoneyProviderProps = {
  children: ReactNode;
};

export function MoneyProvider({ children }: MoneyProviderProps) {
  const [hidden, toggleHidden] = useHiddenAmounts();
  const settings = useMemo(
    () => ({ format: moneyFormat(hidden), hidden, toggleHidden }),
    [hidden, toggleHidden],
  );

  return <MoneyContext value={settings}>{children}</MoneyContext>;
}
