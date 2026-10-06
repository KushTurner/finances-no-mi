import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';

import { getSummary } from '@/api';
import type { DateRange } from '@/api';

export function useSummaryQuery(
  range: DateRange | null,
  accountIds: number[],
  { keepPrevious = false } = {},
) {
  return useQuery({
    queryKey: ['summary', 'totals', range, accountIds],
    queryFn: range ? () => getSummary(range, accountIds) : skipToken,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}
