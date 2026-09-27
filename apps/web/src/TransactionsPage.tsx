import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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
const control =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50';
const button =
  'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50';

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
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Finances No MI
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Transactions
      </h1>
      <p className="mt-2 text-slate-600">
        Browse your imports and choose categories for selected transactions.
      </p>

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Filter by category
          <select
            className={control}
            value={filter}
            disabled={assignment.isPending}
            onChange={(event) => {
              setFilter(event.target.value);
              setSelected([]);
              setNotice('');
              assignment.reset();
            }}
          >
            <option value="all">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        {ready && (
          <p className="pb-2 text-sm text-slate-600">
            {transactions.data.length} transactions
          </p>
        )}
      </div>

      {loadError && (
        <div
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-white p-4 text-red-800"
        >
          <p>Could not load transactions. {loadError.message}.</p>
          <button
            type="button"
            className={`${control} mt-3`}
            onClick={() => {
              void categories.refetch();
              void transactions.refetch();
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!loadError && !ready && (
        <p role="status" className="mt-6">
          Loading transactions…
        </p>
      )}

      {ready && !loadError && (
        <>
          <section
            aria-label="Categorize selected transactions"
            className="mt-6 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-end gap-4">
              <p className="pb-2 text-sm font-medium">
                {selected.length} selected
              </p>
              <label className="grid gap-2 text-sm font-medium">
                Category for selection
                <select
                  className={control}
                  value={choice}
                  disabled={assignment.isPending}
                  onChange={(event) => {
                    setChoice(event.target.value);
                    assignment.reset();
                    setNotice('');
                  }}
                >
                  <option value="">Choose a category</option>
                  {categories.data.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  <option value="clear">Clear category</option>
                </select>
              </label>
              <button
                type="button"
                className={button}
                disabled={
                  selected.length === 0 || choice === '' || assignment.isPending
                }
                onClick={() => assignment.mutate()}
              >
                {assignment.isPending ? 'Saving…' : 'Apply to selected'}
              </button>
              {selected.length > 0 && (
                <button
                  type="button"
                  className={control}
                  disabled={assignment.isPending}
                  onClick={() => setSelected([])}
                >
                  Deselect all
                </button>
              )}
            </div>
            {chosenCategory && (
              <p className="mt-3 text-sm text-slate-600">
                {chosenCategory.definition}
              </p>
            )}
            {choice === 'clear' && (
              <p className="mt-3 text-sm text-slate-600">
                Selected transactions will become uncategorized.
              </p>
            )}
            {assignment.error && (
              <p role="alert" className="mt-3 text-sm text-red-800">
                Could not save categories. {assignment.error.message}. Try
                again.
              </p>
            )}
            {notice && (
              <p role="status" className="mt-3 text-sm text-emerald-800">
                {notice}
              </p>
            )}
          </section>

          {transactions.data.length === 0 ? (
            <p className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
              {filter === 'all'
                ? 'No transactions yet. Import a statement to get started.'
                : 'No transactions match this category.'}
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Imported transactions, newest first
                </caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Account</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.data.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className={
                        selected.includes(transaction.id) ? 'bg-slate-100' : ''
                      }
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-slate-900"
                          aria-label={`Select transaction ${transaction.id}: ${transaction.raw_description}`}
                          checked={selected.includes(transaction.id)}
                          disabled={assignment.isPending}
                          onChange={() => toggleSelection(transaction.id)}
                        />
                      </td>
                      <td className="whitespace-nowrap p-3 text-slate-600">
                        {date.format(
                          new Date(`${transaction.transaction_date}T00:00:00Z`),
                        )}
                      </td>
                      <td className="min-w-48 max-w-sm p-3 break-words whitespace-pre-wrap font-medium">
                        {transaction.raw_description}
                      </td>
                      <td className="p-3 text-slate-600">
                        {transaction.account_name}
                      </td>
                      <td className="p-3 text-slate-600">
                        {transaction.source_type ?? '—'}
                      </td>
                      <td
                        className={`whitespace-nowrap p-3 text-right tabular-nums ${transaction.amount_minor > 0 ? 'text-emerald-800' : ''}`}
                      >
                        {money.format(transaction.amount_minor / 100)}
                      </td>
                      <td className="p-3">
                        {categories.data.find(
                          (category) => category.id === transaction.category_id,
                        )?.name ?? 'Uncategorized'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
