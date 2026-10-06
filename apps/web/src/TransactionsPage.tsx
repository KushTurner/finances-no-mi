import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { PageHeading } from '@/components/PageHeading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { assignCategory, listCategories, listTransactions } from './api';

const money = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  signDisplay: 'exceptZero',
});
const date = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const field = 'grid gap-2';
const fieldLabel = 'text-sm text-muted-foreground';

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<number[]>([]);
  const [choice, setChoice] = useState('');
  const [notice, setNotice] = useState('');
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });
  const transactions = useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => listTransactions(filter),
  });
  const assignment = useMutation({
    mutationFn: () =>
      assignCategory(selected, choice === 'clear' ? null : Number(choice)),
    onSuccess: async (result) => {
      setSelected([]);
      setNotice(
        `Updated ${result.updated_count} ${result.updated_count === 1 ? 'transaction' : 'transactions'}.`,
      );
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
  const chosenCategory = categories.data?.find(
    (category) => String(category.id) === choice,
  );
  const loadError = categories.error ?? transactions.error;
  const ready = categories.isSuccess && transactions.isSuccess;

  function toggleSelection(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
    setNotice('');
    assignment.reset();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeading
        title="Transactions"
        description="Browse your imports and choose categories for selected transactions."
      />

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <div className={field}>
          <label htmlFor="category-filter" className={fieldLabel}>
            Filter by category
          </label>
          <Select
            value={filter}
            disabled={assignment.isPending}
            onValueChange={(value) => {
              setFilter(value);
              setSelected([]);
              setNotice('');
              assignment.reset();
            }}
          >
            <SelectTrigger id="category-filter" className="min-w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {categories.data?.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {ready && (
          <p className="pb-1.5 text-sm text-muted-foreground">
            {transactions.data.length}{' '}
            {transactions.data.length === 1 ? 'transaction' : 'transactions'}
          </p>
        )}
      </div>

      {loadError && (
        <Alert
          variant="destructive"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <AlertDescription>
            Could not load transactions. {loadError.message}.
          </AlertDescription>
          <Button
            variant="outline"
            className="text-foreground"
            onClick={() => {
              void categories.refetch();
              void transactions.refetch();
            }}
          >
            Retry
          </Button>
        </Alert>
      )}
      {!loadError && !ready && (
        <p role="status" className="mt-6 text-muted-foreground">
          Loading transactions…
        </p>
      )}

      {ready && !loadError && (
        <>
          {(transactions.data.length > 0 || notice) && (
            <div className="sticky top-0 z-10 mt-2 bg-background py-4">
              <Card role="region" aria-label="Categorize selected transactions">
                <CardContent>
                  <p className="text-sm font-medium">
                    {selected.length} selected
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <div className={field}>
                      <label htmlFor="category-choice" className={fieldLabel}>
                        Category for selection
                      </label>
                      <Select
                        value={choice}
                        disabled={assignment.isPending}
                        onValueChange={(value) => {
                          setChoice(value);
                          assignment.reset();
                          setNotice('');
                        }}
                      >
                        <SelectTrigger
                          id="category-choice"
                          className="min-w-52"
                        >
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.data.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={String(category.id)}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="clear">Clear category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      disabled={
                        selected.length === 0 ||
                        choice === '' ||
                        assignment.isPending
                      }
                      onClick={() => assignment.mutate()}
                    >
                      {assignment.isPending ? 'Saving…' : 'Apply to selected'}
                    </Button>
                    {selected.length > 0 && (
                      <Button
                        variant="outline"
                        disabled={assignment.isPending}
                        onClick={() => setSelected([])}
                      >
                        Deselect all
                      </Button>
                    )}
                  </div>
                  {chosenCategory && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {chosenCategory.definition}
                    </p>
                  )}
                  {choice === 'clear' && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Selected transactions will become uncategorized.
                    </p>
                  )}
                  {assignment.error && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      Could not save categories. {assignment.error.message}. Try
                      again.
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
          )}

          {transactions.data.length === 0 ? (
            <Card className="mt-6">
              <CardContent className="text-muted-foreground">
                {filter === 'all'
                  ? 'No transactions yet. Import a statement to get started.'
                  : 'No transactions match this category.'}
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-2 py-0">
              <Table>
                <TableCaption className="sr-only">
                  Imported transactions, newest first
                </TableCaption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pl-4">
                      <span className="sr-only">Select</span>
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="pr-4">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.data.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      data-state={
                        selected.includes(transaction.id)
                          ? 'selected'
                          : undefined
                      }
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          aria-label={`Select transaction ${transaction.id}: ${transaction.raw_description}`}
                          checked={selected.includes(transaction.id)}
                          disabled={assignment.isPending}
                          onCheckedChange={() =>
                            toggleSelection(transaction.id)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {date.format(
                          new Date(`${transaction.transaction_date}T00:00:00Z`),
                        )}
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
                        className={`text-right tabular-nums ${transaction.amount_pence > 0 ? 'text-positive' : ''}`}
                      >
                        {money.format(transaction.amount_pence / 100)}
                      </TableCell>
                      <TableCell className="pr-4">
                        {categories.data.find(
                          (category) => category.id === transaction.category_id,
                        )?.name ?? 'Uncategorized'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
