import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import type { DateRange } from '@/api';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useMonthlySummaryQuery } from '@/hooks';
import {
  chartMonths,
  formatChartMonth,
  formatCount,
  incomeAndSpendingChart,
  monthlySpendingChart,
} from '@/lib';

import { useMoney } from './money';
import { LegendItem, Panel, ValuesTable } from './Panel';

type ChartMonth = { month: string; complete: boolean };

function tooltipTitle(
  payload: readonly { payload?: { month?: ChartMonth } }[],
) {
  const month = payload[0]?.payload?.month;
  return month ? formatChartMonth(month.month, month.complete) : '';
}

function Placeholder({
  title,
  description,
  failed,
}: {
  title: string;
  description: string;
  failed: boolean;
}) {
  return (
    <Panel title={title} description={description}>
      <p
        role={failed ? 'alert' : 'status'}
        className="min-h-56 text-sm text-muted-foreground"
      >
        {failed ? 'Could not load monthly totals.' : 'Loading monthly totals…'}
      </p>
    </Panel>
  );
}

export function MonthlySpending({
  range,
  accountIds,
  className,
}: {
  range: DateRange;
  accountIds: number[];
  className?: string;
}) {
  const money = useMoney();
  const summary = useMonthlySummaryQuery(chartMonths(range.to), accountIds);
  const title = 'Monthly spending';
  const description = 'Last 12 months. The selected period is highlighted.';

  if (!summary.data) {
    return (
      <Placeholder
        title={title}
        description={description}
        failed={summary.isError}
      />
    );
  }

  const { rows, hasAverage, ticks } = monthlySpendingChart(summary.data, range);

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
      <ChartContainer
        config={{ spent: { label: 'Spent', color: 'var(--series-spend)' } }}
        className="aspect-auto h-60 w-full"
        role="img"
        aria-label="Spending per month for the last 12 months"
      >
        <BarChart data={rows} margin={{ top: 12, right: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={4}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            ticks={ticks}
            domain={[0, ticks.at(-1) ?? 0]}
            tickFormatter={money.compact}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--foreground)', fillOpacity: 0.04 }}
            content={
              <ChartTooltipContent
                hideIndicator
                valueFormatter={money.wholePounds}
                labelFormatter={(_, payload) => tooltipTitle(payload)}
              />
            }
          />
          {hasAverage && (
            <ReferenceLine
              y={summary.data.average_spent_pence}
              stroke="var(--muted-foreground)"
            />
          )}
          <Bar
            dataKey="spent"
            fill="var(--color-spent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell
                key={row.month.month}
                fillOpacity={row.highlighted ? 1 : 0.28}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </Panel>
  );
}

export function IncomeAndSpending({
  end,
  accountIds,
}: {
  end: string;
  accountIds: number[];
}) {
  const money = useMoney();
  const summary = useMonthlySummaryQuery(chartMonths(end), accountIds);
  const title = 'Income and spending';
  const description = 'Last 12 months';

  if (!summary.data) {
    return (
      <Placeholder
        title={title}
        description={description}
        failed={summary.isError}
      />
    );
  }

  const kept = summary.data.kept_pence;
  const { rows, completeMonths, ticks } = incomeAndSpendingChart(summary.data);
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
      <ChartContainer
        config={{
          income: { label: 'Income', color: 'var(--series-income)' },
          spent: { label: 'Spending', color: 'var(--series-spend)' },
        }}
        className="aspect-auto h-56 w-full"
        role="img"
        aria-label="Income and spending per month for the last 12 months"
      >
        <BarChart
          data={rows}
          barGap={2}
          margin={{ top: 12, right: 8, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={4}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            ticks={ticks}
            domain={[0, ticks.at(-1) ?? 0]}
            tickFormatter={money.compact}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--foreground)', fillOpacity: 0.04 }}
            content={
              <ChartTooltipContent
                valueFormatter={money.wholePounds}
                labelFormatter={(_, payload) => tooltipTitle(payload)}
              />
            }
          />
          <Bar
            dataKey="income"
            fill="var(--color-income)"
            radius={[4, 4, 0, 0]}
            maxBarSize={12}
            isAnimationActive={false}
          />
          <Bar
            dataKey="spent"
            fill="var(--color-spent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={12}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </Panel>
  );
}
