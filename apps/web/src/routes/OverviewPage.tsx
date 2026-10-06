import { LoadError, LoadingState } from '@/components/common';
import {
  HideAmountsToggle,
  OverviewContent,
  PeriodPicker,
} from '@/components/overview';
import { useOverviewSearch, useSummaryQuery } from '@/hooks';
import {
  comparisonLabel,
  comparisonRange,
  formatRange,
  formatShownRange,
  localToday,
  periodRange,
} from '@/lib';
import { MoneyProvider } from '@/providers';

type OverviewPageProps = {
  today?: string;
};

export function OverviewPage({ today = localToday() }: OverviewPageProps) {
  const { period, accountIds } = useOverviewSearch();
  const range = periodRange(period, today);
  const previousRange = comparisonRange(period, range);
  const summary = useSummaryQuery(range, accountIds, { keepPrevious: true });
  const previous = useSummaryQuery(previousRange, accountIds);

  return (
    <MoneyProvider>
      <main className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              Overview
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              {summary.data
                ? formatShownRange(
                    summary.data.start,
                    summary.data.end,
                    range.to,
                  )
                : formatRange(range.from, range.to)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodPicker />
            <HideAmountsToggle />
          </div>
        </div>

        {summary.isPending && <LoadingState>Loading overview…</LoadingState>}
        {summary.isError && !summary.data && (
          <LoadError
            message={`Could not load the overview. ${summary.error.message}.`}
            onRetry={() => void summary.refetch()}
          />
        )}
        {summary.data && (
          <OverviewContent
            summary={summary.data}
            previous={previousRange ? previous.data : undefined}
            comparisonLabel={
              previousRange ? comparisonLabel(period, previousRange) : null
            }
            comparisonStart={previousRange?.from ?? null}
            loading={summary.isPlaceholderData}
          />
        )}
      </main>
    </MoneyProvider>
  );
}
