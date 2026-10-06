import { useMonthlySummaryQuery } from '@/hooks';
import {
  chartMonths,
  formatChartMonth,
  formatCount,
  incomeAndSpendingChart,
} from '@/lib';
import { useMoney } from '@/providers';

import { ChartPlaceholder } from './ChartPlaceholder';
import { LegendItem } from './LegendItem';
import { IncomeAndSpendingChart } from './IncomeAndSpendingChart';
import { Panel } from './Panel';
import { ValuesTable } from './ValuesTable';

type IncomeAndSpendingProps = {
  end: string;
  accountIds: number[];
};

export function IncomeAndSpending({ end, accountIds }: IncomeAndSpendingProps) {
  const money = useMoney();
  const summary = useMonthlySummaryQuery(chartMonths(end), accountIds);
  const title = 'Income and spending';
  const description = 'Last 12 months';

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

  const kept = summary.data.kept_pence;
  const chart = incomeAndSpendingChart(summary.data);
  const { completeMonths } = chart;
  const over = `over the last ${formatCount(completeMonths, 'complete month')}`;

  return (
    <Panel
      title={title}
      description={description}
      legend={
        <>
          <LegendItem
            color="var(--series-income)"
            label="Income"
            shape="square"
          />
          <LegendItem
            color="var(--series-spend)"
            label="Spending"
            shape="square"
          />
        </>
      }
      stat={
        completeMonths === 0 ? (
          'No complete months yet to total.'
        ) : kept >= 0 ? (
          <>
            You kept{' '}
            <b className="font-semibold text-foreground">
              {money.wholePounds(kept)}
            </b>{' '}
            {over}.
          </>
        ) : (
          <>
            You spent{' '}
            <b className="font-semibold text-foreground">
              {money.wholePounds(-kept)}
            </b>{' '}
            more than came in {over}.
          </>
        )
      }
      table={
        <ValuesTable
          caption="Income and spending per month"
          headings={['Month', 'Income', 'Spending', 'Net']}
          rows={summary.data.months.map((month) => ({
            key: month.month,
            cells: [
              formatChartMonth(month.month, month.complete),
              money.pounds(month.income_pence),
              money.pounds(month.spent_pence),
              money.pounds(month.income_pence - month.spent_pence),
            ],
          }))}
        />
      }
    >
      <IncomeAndSpendingChart chart={chart} />
    </Panel>
  );
}
