import { useQuery } from '@tanstack/react-query';

import { listTransactions } from '@/api';

export function useTransactionsQuery(payerId?: number) {
  return useQuery({
    queryKey: ['transactions', payerId],
    queryFn: () => listTransactions(payerId),
  });
}
