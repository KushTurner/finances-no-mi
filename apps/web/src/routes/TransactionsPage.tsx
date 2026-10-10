import { useState } from 'react';

import {
  EmptyState,
  LoadError,
  LoadingState,
  PageHeading,
} from '@/components/common';
import {
  CategoryAssignment,
  TransactionFilters,
  TransactionsTable,
} from '@/components/transactions';
import {
  useAssignCategoryMutation,
  useCategoriesQuery,
  useTransactionsQuery,
} from '@/hooks';
import {
  emptyTransactionsMessage,
  filterByDescription,
  formatCount,
  formatShownCount,
  toggleAll,
  toggleId,
} from '@/lib';

type TransactionsPageProps = {
  initialFilter?: string;
};

export function TransactionsPage({
  initialFilter = 'all',
}: TransactionsPageProps) {
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [choice, setChoice] = useState('');
  const [notice, setNotice] = useState('');
  const categories = useCategoriesQuery();
  const transactions = useTransactionsQuery(filter);
  const assignment = useAssignCategoryMutation();
  const loadError = categories.error ?? transactions.error;
  const ready = categories.isSuccess && transactions.isSuccess;
  const shown = filterByDescription(transactions.data ?? [], search);

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

  function changeSelection(ids: number[]) {
    setSelected(ids);
    setNotice('');
    assignment.reset();
  }

  function toggleSelection(id: number) {
    changeSelection(toggleId(selected, id));
  }

  function toggleAllShown() {
    const shownIds = shown.map((transaction) => transaction.id);
    changeSelection(toggleAll(shownIds, selected));
  }

  function changeFilter(value: string) {
    setFilter(value);
    changeSelection([]);
  }

  function changeSearch(value: string) {
    setSearch(value);
    changeSelection([]);
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

      <TransactionFilters
        category={filter}
        search={search}
        categories={categories.data}
        shownCount={
          ready
            ? formatShownCount(shown.length, transactions.data.length)
            : null
        }
        disabled={assignment.isPending}
        onCategoryChange={changeFilter}
        onSearchChange={changeSearch}
      />

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

          {shown.length === 0 ? (
            <EmptyState className="mt-6">
              {emptyTransactionsMessage(filter, search)}
            </EmptyState>
          ) : (
            <TransactionsTable
              transactions={shown}
              categories={categories.data}
              selectedIds={selected}
              disabled={assignment.isPending}
              onToggle={toggleSelection}
              onToggleAll={toggleAllShown}
            />
          )}
        </>
      )}
    </main>
  );
}
