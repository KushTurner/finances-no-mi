import { useMutation, useQueryClient } from '@tanstack/react-query';

import { importStatement } from '@/api';
import type { NewAccount } from '@/api';

type ImportStatementVariables = {
  file: File;
  newAccount?: NewAccount;
};

export function useImportStatementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, newAccount }: ImportStatementVariables) =>
      importStatement(file, newAccount),
    onSuccess: async (result) => {
      if (result.kind !== 'completed') return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
      ]);
    },
  });
}
