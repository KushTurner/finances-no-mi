import { useCallback, useEffect, useState } from 'react';

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

  useEffect(() => {
    try {
      localStorage.setItem(hiddenAmountsKey, String(hidden));
    } catch {
      // The setting still applies for this visit when storage is unavailable.
    }
  }, [hidden]);

  const toggle = useCallback(() => setHidden((current) => !current), []);

  return [hidden, toggle] as const;
}
