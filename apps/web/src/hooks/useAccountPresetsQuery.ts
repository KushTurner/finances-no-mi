import { useQuery } from '@tanstack/react-query';

import { listAccountPresets } from '@/api';

export function useAccountPresetsQuery() {
  return useQuery({
    queryKey: ['account-presets'],
    queryFn: listAccountPresets,
    staleTime: Infinity,
  });
}
