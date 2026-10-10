import { useState } from 'react';

import {
  EmptyState,
  LoadError,
  LoadingState,
  PageHeading,
} from '@/components/common';
import {
  DescriptionSearch,
  TransactionsTable,
} from '@/components/transactions';
import { useTransactionsQuery } from '@/hooks';
import {
  emptyTransactionsMessage,
  filterByDescription,
  formatShownCount,
} from '@/lib';

export function TransactionsPage() {
  const [search, setSearch] = useState('');
  const transactions = useTransactionsQuery();
  const shown = filterByDescription(transactions.data ?? [], search);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeading
        title="Transactions"
        description="Browse and search your imported transactions."
      />

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <DescriptionSearch value={search} onChange={setSearch} />
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
      {transactions.isSuccess &&
        (shown.length === 0 ? (
          <EmptyState className="mt-6">
            {emptyTransactionsMessage(search)}
          </EmptyState>
        ) : (
          <TransactionsTable transactions={shown} />
        ))}
    </main>
  );
}
