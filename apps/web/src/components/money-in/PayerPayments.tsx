import { LoadError, LoadingState } from '@/components/common';
import { useMarkTransactionsMutation, useTransactionsQuery } from '@/hooks';
import { formatDayWithYear, formatSignedPounds } from '@/lib';

import { CountsAsSelect } from './CountsAsSelect';

type PayerPaymentsProps = {
  payerId: number;
};

export function PayerPayments({ payerId }: PayerPaymentsProps) {
  const payments = useTransactionsQuery(payerId);
  const mark = useMarkTransactionsMutation();

  if (payments.isError) {
    return (
      <LoadError
        message={`Could not load payments. ${payments.error.message}.`}
        onRetry={() => void payments.refetch()}
      />
    );
  }
  if (payments.isPending) {
    return <LoadingState>Loading payments…</LoadingState>;
  }

  return (
    <div className="flex flex-col gap-2">
      {mark.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not save. {mark.error.message}. Try again.
        </p>
      )}
      <ul className="flex flex-col">
        {payments.data.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 not-first:border-t"
          >
            <div className="min-w-40 flex-1">
              <p className="text-sm tabular-nums">
                {formatSignedPounds(payment.amount_pence)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDayWithYear(payment.transaction_date)} ·{' '}
                {payment.account_name}
              </p>
            </div>
            {payment.counts_as_source === 'human' && (
              <span className="text-xs text-muted-foreground">Your choice</span>
            )}
            <CountsAsSelect
              label={`Payment on ${formatDayWithYear(payment.transaction_date)} counts as`}
              value={
                payment.counts_as_source === 'human' ? payment.counts_as : null
              }
              unsetLabel="Payer's choice"
              disabled={mark.isPending}
              onChange={(countsAs) =>
                mark.mutate({
                  transaction_ids: [payment.id],
                  counts_as: countsAs,
                })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
