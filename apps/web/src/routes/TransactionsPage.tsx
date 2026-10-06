import { useState } from 'react';

import {
  EmptyState,
  LoadError,
  LoadingState,
  PageHeading,
} from '@/components/common';
import {
  CategoryAssignment,
  CategoryFilter,
  TransactionsTable,
} from '@/components/transactions';
import {
  useAssignCategoryMutation,
  useCategoriesQuery,
  useTransactionsQuery,
} from '@/hooks';
import { formatCount, toggleId } from '@/lib';

type TransactionsPageProps = {
  initialFilter?: string;
};

export function TransactionsPage({
  initialFilter = 'all',
}: TransactionsPageProps) {
  const [filter, setFilter] = useState(initialFilter);
  const [selected, setSelected] = useState<number[]>([]);
  const [choice, setChoice] = useState('');
  const [notice, setNotice] = useState('');
  const categories = useCategoriesQuery();
  const transactions = useTransactionsQuery(filter);
  const assignment = useAssignCategoryMutation();
  const loadError = categories.error ?? transactions.error;
  const ready = categories.isSuccess && transactions.isSuccess;

  function assignSelected() {
    assignment.mutate(
      {
        transaction_ids: selected,
        category_id: choice === 'clear' ? null : Number(choice),
      },
      {
        onSuccess: (result) => {
          setSelected([]);
          setNotice(
            `Updated ${formatCount(result.updated_count, 'transaction')}.`,
          );
        },
      },
    );
  }

  function toggleSelection(id: number) {
    setSelected((current) => toggleId(current, id));
    setNotice('');
    assignment.reset();
  }

  function changeFilter(value: string) {
    setFilter(value);
    setSelected([]);
    setNotice('');
    assignment.reset();
  }

  function changeChoice(value: string) {
    setChoice(value);
    assignment.reset();
    setNotice('');
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeading
        title="Transactions"
        description="Browse your imports and choose categories for selected transactions."
      />

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <CategoryFilter
          value={filter}
          categories={categories.data}
          disabled={assignment.isPending}
          onChange={changeFilter}
        />
        {ready && (
          <p className="pb-1.5 text-sm text-muted-foreground">
            {formatCount(transactions.data.length, 'transaction')}
          </p>
        )}
      </div>

      {loadError && (
        <LoadError
          className="mt-6"
          message={`Could not load transactions. ${loadError.message}.`}
          onRetry={() => {
            void categories.refetch();
            void transactions.refetch();
          }}
        />
      )}
      {!loadError && !ready && (
        <LoadingState className="mt-6">Loading transactions…</LoadingState>
      )}

      {ready && !loadError && (
        <>
          {(transactions.data.length > 0 || notice) && (
            <CategoryAssignment
              selectedCount={selected.length}
              categories={categories.data}
              choice={choice}
              pending={assignment.isPending}
              error={assignment.error}
              notice={notice}
              onChoiceChange={changeChoice}
              onApply={assignSelected}
              onDeselectAll={() => setSelected([])}
            />
          )}

          {transactions.data.length === 0 ? (
            <EmptyState className="mt-6">
              {filter === 'all'
                ? 'No transactions yet. Import a statement to get started.'
                : 'No transactions match this category.'}
            </EmptyState>
          ) : (
            <TransactionsTable
              transactions={transactions.data}
              categories={categories.data}
              selectedIds={selected}
              disabled={assignment.isPending}
              onToggle={toggleSelection}
            />
          )}
        </>
      )}
    </main>
  );
}
