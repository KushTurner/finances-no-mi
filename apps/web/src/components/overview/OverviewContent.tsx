import { Link } from '@tanstack/react-router';

import type { Summary } from '@/api';
import { EmptyState } from '@/components/common';
import { useOverviewSearch } from '@/hooks';
import {
  formatRange,
  hasHistorySince,
  latestTransactionDate,
  selectedAccounts,
} from '@/lib';

import { AccountCards } from './AccountCards';
import { IncomeAndSpending } from './IncomeAndSpending';
import { LargestPayments } from './LargestPayments';
import { MonthlySpending } from './MonthlySpending';
import { SpendingPace } from './SpendingPace';
import { Totals } from './Totals';

type OverviewContentProps = {
  summary: Summary;
  previous: Summary | undefined;
  comparisonLabel: string | null;
  comparisonStart: string | null;
  loading: boolean;
};

export function OverviewContent({
  summary,
  previous,
  comparisonLabel,
  comparisonStart,
  loading,
}: OverviewContentProps) {
  const { accountIds } = useOverviewSearch();

  if (summary.accounts.length === 0) {
    return (
      <EmptyState>
        No accounts yet.{' '}
        <Link
          to="/import"
          className="text-foreground underline underline-offset-4"
        >
          Import a statement
        </Link>{' '}
        to see where your money goes.
      </EmptyState>
    );
  }

  const shownRange = { from: summary.start, to: summary.end };
  const accounts = selectedAccounts(summary.accounts, accountIds);
  const latestTransaction = latestTransactionDate(accounts);
  const comparisonCovered = hasHistorySince(accounts, comparisonStart);

  return (
    <div
      aria-busy={loading}
      className="flex flex-col gap-7 transition-opacity aria-busy:opacity-60"
    >
      <AccountCards accounts={summary.accounts} />
      {summary.transaction_count === 0 ? (
        <EmptyState>
          No transactions in this period
          {accountIds.length > 0 ? ' for the selected accounts' : ''}.
          {latestTransaction &&
            ` The latest is on ${formatRange(latestTransaction, latestTransaction)}.`}
        </EmptyState>
      ) : (
        <>
          <Totals
            summary={summary}
            comparison={
              comparisonLabel === null
                ? null
                : {
                    label: comparisonLabel,
                    summary: previous,
                    covered: comparisonCovered,
                  }
            }
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <SpendingPace end={summary.end} />
            <IncomeAndSpending end={summary.end} />
            <MonthlySpending range={shownRange} className="lg:col-span-2" />
            <LargestPayments
              payments={summary.largest_payments}
              className="lg:col-span-2"
            />
          </div>
          <p className="max-w-[80ch] text-xs text-muted-foreground">
            Spending is money going out, less repayments. Income is the rest of
            the money coming in. Own-account transfers and savings are left out
            of both. Savings &amp; investments is money put in minus money taken
            out. Net is income minus spending. Mark transactions on the
            Transactions and Money in pages.
          </p>
        </>
      )}
    </div>
  );
}
