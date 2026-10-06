import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type LoadingStateProps = {
  children: ReactNode;
  className?: string;
};

export function LoadingState({ children, className }: LoadingStateProps) {
  return (
    <p role="status" className={cn('text-muted-foreground', className)}>
      {children}
    </p>
  );
}
