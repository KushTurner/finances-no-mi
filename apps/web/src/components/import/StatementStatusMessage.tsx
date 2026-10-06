import { ImportOutcome } from './ImportOutcome';
import type { StatementStatus } from './statementQueue';

type StatementStatusMessageProps = {
  status: StatementStatus;
};

export function StatementStatusMessage({
  status,
}: StatementStatusMessageProps) {
  switch (status.kind) {
    case 'waiting':
      return (
        <p className="mt-2 text-sm text-muted-foreground">Ready to import</p>
      );
    case 'importing':
      return <p className="mt-2 text-sm text-muted-foreground">Importing…</p>;
    case 'imported':
      return <ImportOutcome result={status.result} />;
    case 'failed':
      return (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {status.message}. Import again to retry.
        </p>
      );
  }
}
