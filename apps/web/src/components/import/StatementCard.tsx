import type { NewAccount } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import type { QueuedStatement } from './statementQueue';
import { StatementStatusMessage } from './StatementStatusMessage';

type StatementCardProps = {
  statement: QueuedStatement;
  removable: boolean;
  disabled: boolean;
  onRemove: () => void;
  onAddAccount: (newAccount: NewAccount) => void;
};

export function StatementCard({
  statement,
  removable,
  disabled,
  onRemove,
  onAddAccount,
}: StatementCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <span className="font-medium break-all">{statement.file.name}</span>
          <StatementStatusMessage
            status={statement.status}
            disabled={disabled}
            onAddAccount={onAddAccount}
          />
        </div>
        {removable && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove ${statement.file.name}`}
            onClick={onRemove}
          >
            Remove
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
