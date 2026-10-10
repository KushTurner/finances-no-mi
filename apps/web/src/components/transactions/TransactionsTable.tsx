import type { Transaction } from '@/api';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDayWithYear, formatSignedPounds } from '@/lib';
import { cn } from '@/lib/utils';

type TransactionsTableProps = {
  transactions: Transaction[];
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <Card className="mt-6 py-0">
      <Table>
        <TableCaption className="sr-only">
          Imported transactions, newest first
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="pr-4 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="pl-4 text-muted-foreground">
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
                  'pr-4 text-right tabular-nums',
                  transaction.amount_pence > 0 && 'text-positive',
                )}
              >
                {formatSignedPounds(transaction.amount_pence)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
