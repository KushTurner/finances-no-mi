import { useQuery } from '@tanstack/react-query';

import { listTransactions } from '@/api';

export function useTransactionsQuery() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: listTransactions,
  });
}
