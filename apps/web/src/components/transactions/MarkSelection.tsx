import type { CountsAs } from '@/api';
import { CountsAsSelect } from '@/components/money-in';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type MarkSelectionProps = {
  selectedCount: number;
  choice: CountsAs | null | undefined;
  pending: boolean;
  error: Error | null;
  notice: string;
  onChoiceChange: (choice: CountsAs | null) => void;
  onApply: () => void;
  onDeselectAll: () => void;
};

export function MarkSelection({
  selectedCount,
  choice,
  pending,
  error,
  notice,
  onChoiceChange,
  onApply,
  onDeselectAll,
}: MarkSelectionProps) {
  return (
    <div className="sticky top-0 z-10 mt-2 bg-background py-4">
      <Card role="region" aria-label="Mark selected transactions">
        <CardContent>
          <p className="text-sm font-medium">{selectedCount} selected</p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <span
                aria-hidden="true"
                className="text-sm text-muted-foreground"
              >
                Mark selected as
              </span>
              <CountsAsSelect
                label="Mark selected as"
                value={choice}
                unsetLabel="Default"
                placeholder="Choose…"
                disabled={pending}
                onChange={onChoiceChange}
              />
            </div>
            <Button
              disabled={selectedCount === 0 || choice === undefined || pending}
              onClick={onApply}
            >
              {pending ? 'Saving…' : 'Apply to selected'}
            </Button>
            {selectedCount > 0 && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={onDeselectAll}
              >
                Deselect all
              </Button>
            )}
          </div>
          {choice === null && (
            <p className="mt-3 text-sm text-muted-foreground">
              Default removes your mark: money out counts as spending and money
              in as income, unless the payer has a choice.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Could not save. {error.message}. Try again.
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 text-sm text-positive">
              {notice}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
