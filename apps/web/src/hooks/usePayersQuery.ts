import { useQuery } from '@tanstack/react-query';

import { listPayers } from '@/api';

export function usePayersQuery() {
  return useQuery({ queryKey: ['payers'], queryFn: listPayers });
}
