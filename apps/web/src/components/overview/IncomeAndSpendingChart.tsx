import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { IncomeAndSpendingChartData } from '@/lib';
import { useMoney } from '@/providers';

import { monthTooltipTitle } from './monthTooltipTitle';

type IncomeAndSpendingChartProps = {
  chart: IncomeAndSpendingChartData;
};

export function IncomeAndSpendingChart({ chart }: IncomeAndSpendingChartProps) {
  const money = useMoney();
  const { rows, ticks } = chart;

  return (
    <ChartContainer
      config={{
        income: { label: 'Income', color: 'var(--series-income)' },
        spent: { label: 'Spending', color: 'var(--series-spend)' },
      }}
      className="aspect-auto h-56 w-full"
      role="img"
      aria-label="Income and spending per month for the last 12 months"
    >
      <BarChart data={rows} barGap={2} margin={{ top: 12, right: 8, left: 0 }}>
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
              labelFormatter={(_, payload) => monthTooltipTitle(payload)}
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
  );
}
