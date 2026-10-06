import { Link } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useMemo } from 'react';

import type { DateRange, Summary } from '@/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSummaryQuery } from '@/hooks';

import { AccountCards } from './overview/AccountCards';
import { CategorySpending } from './overview/CategorySpending';
import { formatMonthName, formatRange, moneyFormat } from './overview/format';
import { LargestPayments } from './overview/LargestPayments';
import { MoneyContext, useHiddenAmounts } from './overview/money';
import { IncomeAndSpending, MonthlySpending } from './overview/MonthlyCharts';
import {
  comparisonRange,
  localToday,
  monthOf,
  periodLabels,
  periodRange,
  periods,
} from './overview/periods';
import type { Period } from './overview/periods';
import { SpendingPace } from './overview/SpendingPace';
import { Totals, UncategorizedNotice } from './overview/Totals';

function comparisonLabel(period: Period, range: DateRange) {
  if (period === 'last_month') return formatMonthName(monthOf(range.from));
  if (period === 'last_90_days') return 'the previous 90 days';
  return 'the previous 12 months';
}

export function OverviewPage({
  period,
  accountIds,
  onPeriodChange,
  onAccountsChange,
  today = localToday(),
}: {
  period: Period;
  accountIds: number[];
  onPeriodChange: (period: Period) => void;
  onAccountsChange: (accountIds: number[]) => void;
  today?: string;
}) {
  const [amountsHidden, toggleAmounts] = useHiddenAmounts();
  const money = useMemo(() => moneyFormat(amountsHidden), [amountsHidden]);
  const range = periodRange(period, today);
  const previousRange = comparisonRange(period, range);
  const summary = useSummaryQuery(range, accountIds, { keepPrevious: true });
  const previous = useSummaryQuery(previousRange, accountIds);

  return (
    <MoneyContext value={money}>
      <main className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              Overview
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              {summary.data
                ? describeRange(summary.data, range)
                : formatRange(range.from, range.to)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Period"
              className="inline-flex flex-wrap gap-0.5 rounded-[9px] bg-secondary p-0.5"
            >
              {periods.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === period}
                  onClick={() => onPeriodChange(option)}
                  className="rounded-[7px] px-3 py-1.5 text-[13px] font-medium whitespace-nowrap aria-pressed:bg-[#3a3a3e] aria-pressed:shadow-[0_1px_3px_rgb(0_0_0/50%)] sm:px-3.5"
                >
                  {periodLabels[option]}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={amountsHidden}
              onClick={toggleAmounts}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {amountsHidden ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
              Hide amounts
            </button>
          </div>
        </div>

        {summary.isPending && (
          <p role="status" className="text-muted-foreground">
            Loading overview…
          </p>
        )}
        {summary.isError && !summary.data && (
          <Alert
            variant="destructive"
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <AlertDescription>
              Could not load the overview. {summary.error.message}.
            </AlertDescription>
            <Button
              variant="outline"
              className="text-foreground"
              onClick={() => void summary.refetch()}
            >
              Retry
            </Button>
          </Alert>
        )}
        {summary.data && (
          <Overview
            summary={summary.data}
            previous={previousRange ? previous.data : undefined}
            comparisonLabel={
              previousRange ? comparisonLabel(period, previousRange) : null
            }
            comparisonStart={previousRange?.from ?? null}
            periodLabel={periodLabels[period]}
            accountIds={accountIds}
            loading={summary.isPlaceholderData}
            onAccountsChange={onAccountsChange}
          />
        )}
      </main>
    </MoneyContext>
  );
}

function describeRange(summary: Summary, range: DateRange) {
  const formatted = formatRange(summary.start, summary.end);
  return summary.end < range.to
    ? `${formatted} · up to your latest transaction`
    : formatted;
}

function Overview({
  summary,
  previous,
  comparisonLabel,
  comparisonStart,
  periodLabel,
  accountIds,
  loading,
  onAccountsChange,
}: {
  summary: Summary;
  previous: Summary | undefined;
  comparisonLabel: string | null;
  comparisonStart: string | null;
  periodLabel: string;
  accountIds: number[];
  loading: boolean;
  onAccountsChange: (accountIds: number[]) => void;
}) {
  if (summary.accounts.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground">
          No accounts yet.{' '}
          <Link
            to="/import"
            className="text-foreground underline underline-offset-4"
          >
            Import a statement
          </Link>{' '}
          to see where your money goes.
        </CardContent>
      </Card>
    );
  }

  function toggleAccount(id: number) {
    const next = accountIds.includes(id)
      ? accountIds.filter((selected) => selected !== id)
      : [...accountIds, id].sort((a, b) => a - b);
    onAccountsChange(next.length === summary.accounts.length ? [] : next);
  }

  const shownRange = { from: summary.start, to: summary.end };
  const selectedAccounts = summary.accounts.filter(
    (account) => accountIds.length === 0 || accountIds.includes(account.id),
  );
  const latestTransaction = selectedAccounts
    .map((account) => account.latest_transaction_date)
    .filter((date) => date !== null)
    .sort()
    .at(-1);
  const earliestTransaction = selectedAccounts
    .map((account) => account.earliest_transaction_date)
    .filter((date) => date !== null)
    .sort()
    .at(0);
  const comparisonCovered =
    comparisonStart !== null &&
    earliestTransaction !== undefined &&
    earliestTransaction <= comparisonStart;

  return (
    <div
      aria-busy={loading}
      className="flex flex-col gap-7 transition-opacity aria-busy:opacity-60"
    >
      <AccountCards
        accounts={summary.accounts}
        selectedIds={accountIds}
        periodLabel={periodLabel}
        onToggle={toggleAccount}
        onClear={() => onAccountsChange([])}
      />
      {summary.transaction_count === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground">
            No transactions in this period
            {accountIds.length > 0 ? ' for the selected accounts' : ''}.
            {latestTransaction &&
              ` The latest is on ${formatRange(latestTransaction, latestTransaction)}.`}
          </CardContent>
        </Card>
      ) : (
        <>
          <UncategorizedNotice uncategorized={summary.uncategorized} />
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
            <SpendingPace end={summary.end} accountIds={accountIds} />
            <CategorySpending summary={summary} periodLabel={periodLabel} />
            <MonthlySpending
              range={shownRange}
              accountIds={accountIds}
              className="lg:col-span-2"
            />
            <IncomeAndSpending end={summary.end} accountIds={accountIds} />
            <LargestPayments
              payments={summary.largest_payments}
              periodLabel={periodLabel}
            />
          </div>
          <p className="max-w-[80ch] text-xs text-muted-foreground">
            Spending leaves out transfers between your own accounts. Refunds and
            repayments reduce spending in their category. Uncategorized money
            going out counts as spending; uncategorized money coming in isn’t
            counted until you categorize it.
          </p>
        </>
      )}
    </div>
  );
}
