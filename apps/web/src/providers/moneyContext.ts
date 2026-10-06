import { createContext, useContext } from 'react';

import { moneyFormat } from '@/lib';
import type { MoneyFormat } from '@/lib';

type MoneySettings = {
  format: MoneyFormat;
  hidden: boolean;
  toggleHidden: () => void;
};

export const MoneyContext = createContext<MoneySettings>({
  format: moneyFormat(false),
  hidden: false,
  toggleHidden: () => {},
});

export function useMoney() {
  return useContext(MoneyContext).format;
}

export function useAmountsHidden() {
  const { hidden, toggleHidden } = useContext(MoneyContext);
  return { hidden, toggleHidden };
}
