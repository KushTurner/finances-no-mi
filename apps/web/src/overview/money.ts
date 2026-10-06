import { createContext, useContext, useState } from 'react';

import { moneyFormat } from '@/lib';

const hiddenAmountsKey = 'overview-hide-amounts';

function readHiddenAmounts() {
  try {
    return localStorage.getItem(hiddenAmountsKey) === 'true';
  } catch {
    return false;
  }
}

export function useHiddenAmounts() {
  const [hidden, setHidden] = useState(readHiddenAmounts);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(hiddenAmountsKey, String(next));
    } catch {
      // The setting still applies for this visit when storage is unavailable.
    }
  }

  return [hidden, toggle] as const;
}

export const MoneyContext = createContext(moneyFormat(false));

export function useMoney() {
  return useContext(MoneyContext);
}
