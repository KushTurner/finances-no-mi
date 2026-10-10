import { useState } from 'react';

import type { CountsAs } from '@/api';
import {
  EmptyState,
  LoadError,
  LoadingState,
  PageHeading,
} from '@/components/common';
import {
  DescriptionSearch,
  MarkSelection,
  TransactionsTable,
} from '@/components/transactions';
import { useMarkTransactionsMutation, useTransactionsQuery } from '@/hooks';
import {
  emptyTransactionsMessage,
  filterByDescription,
  formatCount,
  formatShownCount,
  toggleAll,
  toggleId,
} from '@/lib';

export function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [choice, setChoice] = useState<CountsAs | null>();
  const [notice, setNotice] = useState('');
  const transactions = useTransactionsQuery();
  const mark = useMarkTransactionsMutation();
  const shown = filterByDescription(transactions.data ?? [], search);

  function changeSelection(ids: number[]) {
    setSelected(ids);
    setNotice('');
    mark.reset();
  }

  function changeSearch(value: string) {
    setSearch(value);
    changeSelection([]);
  }

  function changeChoice(value: CountsAs | null) {
    setChoice(value);
    setNotice('');
    mark.reset();
  }

  function markSelected() {
    if (choice === undefined) return;
    mark.mutate(
      { transaction_ids: selected, counts_as: choice },
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeading
        title="Transactions"
        description="Search your transactions and mark how selected ones count."
      />

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <DescriptionSearch value={search} onChange={changeSearch} />
        {transactions.isSuccess && (
          <p className="pb-1.5 text-sm text-muted-foreground">
            {formatShownCount(shown.length, transactions.data.length)}
          </p>
        )}
      </div>

      {transactions.isError && (
        <LoadError
          className="mt-6"
          message={`Could not load transactions. ${transactions.error.message}.`}
          onRetry={() => void transactions.refetch()}
        />
      )}
      {transactions.isPending && (
        <LoadingState className="mt-6">Loading transactions…</LoadingState>
      )}
      {transactions.isSuccess && transactions.data.length > 0 && (
        <MarkSelection
          selectedCount={selected.length}
          choice={choice}
          pending={mark.isPending}
          error={mark.error}
          notice={notice}
          onChoiceChange={changeChoice}
          onApply={markSelected}
          onDeselectAll={() => changeSelection([])}
        />
      )}
      {transactions.isSuccess &&
        (shown.length === 0 ? (
          <EmptyState className="mt-6">
            {emptyTransactionsMessage(search)}
          </EmptyState>
        ) : (
          <TransactionsTable
            transactions={shown}
            selectedIds={selected}
            disabled={mark.isPending}
            onToggle={(id) => changeSelection(toggleId(selected, id))}
            onToggleAll={() =>
              changeSelection(
                toggleAll(
                  shown.map((transaction) => transaction.id),
                  selected,
                ),
              )
            }
          />
        ))}
    </main>
  );
}
