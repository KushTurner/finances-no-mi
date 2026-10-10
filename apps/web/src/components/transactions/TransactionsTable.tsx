import type { Transaction } from '@/api';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  countsAsLabel,
  formatDayWithYear,
  formatSignedPounds,
  selectAllState,
} from '@/lib';
import { cn } from '@/lib/utils';

type TransactionsTableProps = {
  transactions: Transaction[];
  selectedIds: number[];
  disabled: boolean;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
};

export function TransactionsTable({
  transactions,
  selectedIds,
  disabled,
  onToggle,
  onToggleAll,
}: TransactionsTableProps) {
  const allState = selectAllState(
    transactions.map((transaction) => transaction.id),
    selectedIds,
  );

  return (
    <Card className="mt-2 py-0">
      <Table>
        <TableCaption className="sr-only">
          Imported transactions, newest first
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all shown transactions"
                className="data-indeterminate:border-primary data-indeterminate:bg-primary dark:data-indeterminate:bg-primary data-indeterminate:text-primary-foreground data-indeterminate:before:h-0.5 data-indeterminate:before:w-2 data-indeterminate:before:rounded-full data-indeterminate:before:bg-current data-indeterminate:[&_svg]:hidden"
                checked={allState}
                disabled={disabled}
                onCheckedChange={onToggleAll}
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="pr-4">Counts as</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow
              key={transaction.id}
              data-state={
                selectedIds.includes(transaction.id) ? 'selected' : undefined
              }
            >
              <TableCell className="pl-4">
                <Checkbox
                  aria-label={`Select transaction ${transaction.id}: ${transaction.raw_description}`}
                  checked={selectedIds.includes(transaction.id)}
                  disabled={disabled}
                  onCheckedChange={() => onToggle(transaction.id)}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDayWithYear(transaction.transaction_date)}
              </TableCell>
              <TableCell className="min-w-48 max-w-sm font-medium break-words whitespace-pre-wrap">
                {transaction.raw_description}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {transaction.account_name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {transaction.source_type ?? '—'}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right tabular-nums',
                  transaction.amount_pence > 0 && 'text-positive',
                )}
              >
                {formatSignedPounds(transaction.amount_pence)}
              </TableCell>
              <TableCell
                className={cn(
                  'pr-4',
                  !transaction.counts_as && 'text-muted-foreground',
                )}
              >
                {countsAsLabel(transaction)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
