import { useQuery } from '@tanstack/react-query';

import { getDailySpending } from '@/api';
import type { DateRange } from '@/api';

export function useDailySpendingQuery(range: DateRange, accountIds: number[]) {
  return useQuery({
    queryKey: ['summary', 'days', range, accountIds],
    queryFn: () => getDailySpending(range, accountIds),
  });
}
