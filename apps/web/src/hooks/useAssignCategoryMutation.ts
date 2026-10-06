import { useMutation, useQueryClient } from '@tanstack/react-query';

import { assignCategory } from '@/api';

export function useAssignCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignCategory,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
      ]),
  });
}
