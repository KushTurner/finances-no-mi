import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setPayerRule } from '@/api';

export function useSetPayerRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPayerRule,
    onSuccess: () =>
      Promise.all(
        ['payers', 'transactions', 'summary'].map((resource) =>
          queryClient.invalidateQueries({ queryKey: [resource] }),
        ),
      ),
  });
}
