import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LoadErrorProps = {
  message: string;
  onRetry: () => void;
  className?: string;
};

export function LoadError({ message, onRetry, className }: LoadErrorProps) {
  return (
    <Alert
      variant="destructive"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 p-4',
        className,
      )}
    >
      <AlertDescription>{message}</AlertDescription>
      <Button variant="outline" className="text-foreground" onClick={onRetry}>
        Retry
      </Button>
    </Alert>
  );
}
