import type { Summary } from '@/api';
import { formatDay } from '@/lib';
import { useMoney } from '@/providers';

import { Panel } from './Panel';

type LargestPaymentsProps = {
  payments: Summary['largest_payments'];
  periodLabel: string;
};

export function LargestPayments({
  payments,
  periodLabel,
}: LargestPaymentsProps) {
  const money = useMoney();

  return (
    <Panel
      title="Largest payments"
      description={`${periodLabel} · excluding transfers between your accounts`}
    >
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No payments in this period.
        </p>
      ) : (
        <ol className="flex flex-col">
          {payments.map((payment, index) => (
            <li
              key={payment.id}
              className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 not-first:border-t"
            >
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground"
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span
                  title={payment.description}
                  className="block truncate text-sm font-medium"
                >
                  {payment.description}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatDay(payment.date)} · {payment.account_name}
                </span>
              </span>
              <span className="text-sm font-medium tabular-nums">
                {money.pounds(-payment.amount_pence)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
