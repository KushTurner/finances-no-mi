import type { DateRange } from '@/api';
import { useMonthlySummaryQuery, useOverviewSearch } from '@/hooks';
import { chartMonths, formatChartMonth, monthlySpendingChart } from '@/lib';
import { useMoney } from '@/providers';

import { ChartPlaceholder } from './ChartPlaceholder';
import { LegendItem } from './LegendItem';
import { MonthlySpendingChart } from './MonthlySpendingChart';
import { Panel } from './Panel';
import { ValuesTable } from './ValuesTable';

type MonthlySpendingProps = {
  range: DateRange;
  className?: string;
};

export function MonthlySpending({ range, className }: MonthlySpendingProps) {
  const { accountIds } = useOverviewSearch();
  const money = useMoney();
  const summary = useMonthlySummaryQuery(chartMonths(range.to), accountIds);
  const title = 'Monthly spending';
  const description = 'Last 12 months. The selected period is highlighted.';

  if (!summary.data) {
    return (
      <ChartPlaceholder
        title={title}
        description={description}
        failed={summary.isError}
        loadingMessage="Loading monthly totals…"
        errorMessage="Could not load monthly totals."
      />
    );
  }

  const chart = monthlySpendingChart(summary.data, range);
  const { hasAverage } = chart;

  return (
    <Panel
      title={title}
      description={description}
      className={className}
      legend={
        hasAverage && (
          <LegendItem color="var(--muted-foreground)" label="Average" />
        )
      }
      table={
        <ValuesTable
          caption="Spending per month"
          headings={['Month', 'Spent']}
          rows={summary.data.months.map((month) => ({
            key: month.month,
            cells: [
              formatChartMonth(month.month, month.complete),
              money.pounds(month.spent_pence),
            ],
          }))}
        />
      }
      stat={
        hasAverage ? (
          <>
            Average of complete months:{' '}
            <b className="font-semibold text-foreground">
              {money.wholePounds(summary.data.average_spent_pence)}
            </b>
          </>
        ) : (
          'No complete months yet to average.'
        )
      }
    >
      <MonthlySpendingChart
        chart={chart}
        averagePence={summary.data.average_spent_pence}
      />
    </Panel>
  );
}
