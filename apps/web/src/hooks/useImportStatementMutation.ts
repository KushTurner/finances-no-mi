import { useMutation, useQueryClient } from '@tanstack/react-query';

import { importStatement } from '@/api';

export function useImportStatementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importStatement,
    onSuccess: async (result) => {
      if (result.kind !== 'completed') return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
      ]);
    },
  });
}
