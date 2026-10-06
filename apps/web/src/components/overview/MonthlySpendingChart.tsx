import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { MonthlySpendingChartData } from '@/lib';
import { useMoney } from '@/providers';

import { monthTooltipTitle } from './monthTooltipTitle';

type MonthlySpendingChartProps = {
  chart: MonthlySpendingChartData;
  averagePence: number;
};

export function MonthlySpendingChart({
  chart,
  averagePence,
}: MonthlySpendingChartProps) {
  const money = useMoney();
  const { rows, hasAverage, ticks } = chart;

  return (
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
              labelFormatter={(_, payload) => monthTooltipTitle(payload)}
            />
          }
        />
        {hasAverage && (
          <ReferenceLine y={averagePence} stroke="var(--muted-foreground)" />
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
  );
}
