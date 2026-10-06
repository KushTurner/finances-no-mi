import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

import type { Summary } from '@/api';
import { compareTotals, splitPence } from '@/lib';

import { useMoney } from './money';

export type Comparison = {
  label: string;
  summary: Summary | undefined;
  covered: boolean;
};

export function Totals({
  summary,
  comparison,
}: {
  summary: Summary;
  comparison: Comparison | null;
}) {
  const previous = comparison?.summary;

  return (
    <section
      aria-label="Totals"
      className="grid rounded-2xl border bg-card sm:grid-cols-3"
    >
      <Total
        label="Spent"
        value={summary.spent_pence}
        change={
          comparison && (
            <Change
              current={summary.spent_pence}
              previous={previous?.spent_pence}
              hasPrevious={Boolean(previous?.transaction_count)}
              covered={comparison.covered}
              higherIsBetter={false}
              against={comparison.label}
            />
          )
        }
      />
      <Total
        label="Income"
        value={summary.income_pence}
        change={
          comparison && (
            <Change
              current={summary.income_pence}
              previous={previous?.income_pence}
              hasPrevious={Boolean(previous?.transaction_count)}
              covered={comparison.covered}
              higherIsBetter
              against={comparison.label}
            />
          )
        }
      />
      <Total
        label="Net"
        value={summary.net_pence}
        change={
          comparison && (
            <Change
              current={summary.net_pence}
              previous={previous?.net_pence}
              hasPrevious={Boolean(previous?.transaction_count)}
              covered={comparison.covered}
              higherIsBetter
              against={comparison.label}
              inPounds
            />
          )
        }
      />
    </section>
  );
}

function Total({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change: ReactNode;
}) {
  const money = useMoney();
  const formatted = money.pounds(value);
  const { whole, pence } = splitPence(formatted);

  return (
    <div className="flex flex-col gap-1 border-border px-6 py-5 not-first:border-t sm:not-first:border-t-0 sm:not-first:border-l">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        aria-label={`${label} ${formatted}`}
        className="font-heading text-[34px] leading-tight font-semibold tracking-tight tabular-nums"
      >
        {whole}
        {pence && (
          <span className="text-[0.55em] font-medium text-muted-foreground">
            .{pence}
          </span>
        )}
      </p>
      {change}
    </div>
  );
}

function Change({
  current,
  previous,
  hasPrevious,
  covered,
  higherIsBetter,
  against,
  inPounds = false,
}: {
  current: number;
  previous: number | undefined;
  hasPrevious: boolean;
  covered: boolean;
  higherIsBetter: boolean;
  against: string;
  inPounds?: boolean;
}) {
  const money = useMoney();
  const comparison = compareTotals({
    current,
    previous,
    hasPrevious,
    covered,
    higherIsBetter,
    inPounds,
  });

  switch (comparison.kind) {
    case 'not-enough-history':
      return (
        <p className="text-[13px] text-muted-foreground">
          Not enough history to compare
        </p>
      );
    case 'comparing':
      return <p className="text-[13px] text-muted-foreground">Comparing…</p>;
    case 'no-previous-transactions':
      return (
        <p className="text-[13px] text-muted-foreground">
          No transactions in {against} to compare
        </p>
      );
    case 'nothing-to-compare':
      return (
        <p className="text-[13px] text-muted-foreground">
          None in {against} to compare
        </p>
      );
    case 'about-the-same':
      return (
        <p className="text-[13px] text-muted-foreground">
          <b className="font-semibold text-foreground">→ About the same</b> as{' '}
          {against}
        </p>
      );
    case 'changed': {
      const amount = inPounds
        ? money.wholePounds(comparison.differencePence)
        : `${comparison.percent.toFixed(0)}%`;
      return (
        <p className="text-[13px] text-muted-foreground">
          <b
            className={`font-semibold ${comparison.favourable ? 'text-positive' : 'text-destructive'}`}
          >
            {comparison.more ? '↑' : '↓'} {amount}{' '}
            {comparison.more ? 'more' : 'less'}
          </b>{' '}
          than {against}
          <span className="sr-only">
            , {comparison.favourable ? 'favourable' : 'unfavourable'}
          </span>
        </p>
      );
    }
  }
}

export function UncategorizedNotice({
  uncategorized,
}: {
  uncategorized: Summary['uncategorized'];
}) {
  const money = useMoney();
  const count = uncategorized.outgoing_count + uncategorized.incoming_count;
  if (count === 0) return null;

  return (
    <div
      role="note"
      className="flex flex-wrap items-start justify-between gap-3.5 rounded-xl border border-notice-border bg-notice px-4 py-3 text-sm text-notice-foreground"
    >
      <p className="max-w-[72ch]">
        <strong className="font-semibold">
          {count} {count === 1 ? 'transaction isn’t' : 'transactions aren’t'}{' '}
          categorized yet.
        </strong>{' '}
        {uncategorized.outgoing_count > 0 &&
          `${money.pounds(uncategorized.outgoing_pence)} going out is counted as spending and may include transfers between your accounts. `}
        {uncategorized.incoming_count > 0 &&
          `${money.pounds(uncategorized.incoming_pence)} coming in isn’t counted.`}
      </p>
      <Link
        to="/transactions"
        search={{ category: 'uncategorized' }}
        className="font-semibold underline underline-offset-2"
      >
        Review in Transactions
      </Link>
    </div>
  );
}
