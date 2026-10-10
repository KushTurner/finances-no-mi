import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markTransactions } from '@/api';

export function useMarkTransactionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markTransactions,
    onSuccess: () =>
      Promise.all(
        ['transactions', 'summary'].map((resource) =>
          queryClient.invalidateQueries({ queryKey: [resource] }),
        ),
      ),
  });
}
