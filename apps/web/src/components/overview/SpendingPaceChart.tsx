import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { SpendingPaceData } from '@/lib';
import { useMoney } from '@/providers';

type SpendingPaceChartProps = {
  pace: SpendingPaceData;
  monthName: string;
  previousName: string;
  singleDay: boolean;
};

export function SpendingPaceChart({
  pace,
  monthName,
  previousName,
  singleDay,
}: SpendingPaceChartProps) {
  const money = useMoney();
  const { rows, ticks } = pace;

  return (
    <ChartContainer
      config={{
        current: { label: monthName, color: 'var(--series-spend)' },
        previous: { label: previousName, color: 'var(--series-previous)' },
      }}
      className="aspect-auto h-56 w-full"
      role="img"
      aria-label={`Running spending in ${monthName} compared with ${previousName}`}
    >
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="day"
          type="number"
          domain={[1, 31]}
          ticks={[1, 8, 15, 22, 29]}
          tickLine={false}
          axisLine={false}
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
          content={
            <ChartTooltipContent
              indicator="line"
              valueFormatter={money.wholePounds}
              labelFormatter={(_, payload) =>
                `Day ${String(payload[0]?.payload?.day ?? '')}`
              }
            />
          }
        />
        <Line
          dataKey="previous"
          stroke="var(--color-previous)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Area
          dataKey="current"
          stroke="var(--color-current)"
          strokeWidth={2}
          fill="var(--color-current)"
          fillOpacity={0.1}
          dot={singleDay ? { r: 3, fill: 'var(--color-current)' } : false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
