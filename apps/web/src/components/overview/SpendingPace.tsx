import { useDailySpendingQuery } from '@/hooks';
import {
  formatMonthName,
  isLastDayOfMonth,
  monthOf,
  paceRanges,
  spendingPace,
} from '@/lib';
import { useMoney } from '@/providers';

import { ChartPlaceholder } from './ChartPlaceholder';
import { LegendItem } from './LegendItem';
import { Panel } from './Panel';
import { SpendingPaceChart } from './SpendingPaceChart';
import { ValuesTable } from './ValuesTable';

type SpendingPaceProps = {
  end: string;
  accountIds: number[];
};

export function SpendingPace({ end, accountIds }: SpendingPaceProps) {
  const money = useMoney();
  const ranges = paceRanges(end);
  const current = useDailySpendingQuery(ranges.current, accountIds);
  const previous = useDailySpendingQuery(ranges.previous, accountIds);
  const monthName = formatMonthName(monthOf(end));
  const previousName = formatMonthName(monthOf(ranges.previous.from));
  const monthComplete = isLastDayOfMonth(end);
  const title = monthComplete ? `${monthName} spending` : `${monthName} so far`;
  const description = `Running total, compared with ${previousName}`;

  if (!current.data || !previous.data) {
    return (
      <ChartPlaceholder
        title={title}
        description={description}
        failed={Boolean(current.error || previous.error)}
        loadingMessage="Loading spending pace…"
        errorMessage="Could not load spending pace."
      />
    );
  }

  const pace = spendingPace(current.data, previous.data);
  const { rows, sameDay, difference } = pace;
  const comparedWith = monthComplete
    ? `${previousName} overall`
    : `by ${sameDay} ${previousName}`;

  return (
    <Panel
      title={title}
      description={description}
      legend={
        <>
          <LegendItem color="var(--series-spend)" label={monthName} />
          <LegendItem color="var(--series-previous)" label={previousName} />
        </>
      }
      stat={
        difference === 0 ? (
          <>The same as {comparedWith}.</>
        ) : (
          <>
            <b className="font-semibold text-foreground">
              {money.wholePounds(Math.abs(difference))}
            </b>{' '}
            {difference > 0 ? 'more' : 'less'} than {comparedWith}.
          </>
        )
      }
      table={
        <ValuesTable
          caption={`Running spending in ${monthName} and ${previousName}`}
          headings={['Day', monthName, previousName]}
          rows={rows.map((row) => ({
            key: String(row.day),
            cells: [
              String(row.day),
              row.current === undefined ? '—' : money.wholePounds(row.current),
              row.previous === undefined
                ? '—'
                : money.wholePounds(row.previous),
            ],
          }))}
        />
      }
    >
      <SpendingPaceChart
        pace={pace}
        monthName={monthName}
        previousName={previousName}
        singleDay={current.data.length === 1}
      />
    </Panel>
  );
}
