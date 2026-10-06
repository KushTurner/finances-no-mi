import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
};

export function EmptyState({ children, className }: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
