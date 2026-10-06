import { useQuery } from '@tanstack/react-query';

import { getMonthlySummary } from '@/api';
import type { DateRange } from '@/api';

export function useMonthlySummaryQuery(
  months: DateRange,
  accountIds: number[],
) {
  return useQuery({
    queryKey: ['summary', 'months', months, accountIds],
    queryFn: () => getMonthlySummary(months, accountIds),
  });
}
