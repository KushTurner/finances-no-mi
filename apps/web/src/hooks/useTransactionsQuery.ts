import { useQuery } from '@tanstack/react-query';

import { listTransactions } from '@/api';

export function useTransactionsQuery(category: string) {
  return useQuery({
    queryKey: ['transactions', category],
    queryFn: () => listTransactions(category),
  });
}
