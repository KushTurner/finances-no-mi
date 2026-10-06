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
import { useDailySpendingQuery } from '@/hooks';
import {
  formatMonthName,
  isLastDayOfMonth,
  monthOf,
  paceRanges,
  spendingPace,
} from '@/lib';

import { useMoney } from './money';
import { LegendItem, Panel, ValuesTable } from './Panel';

export function SpendingPace({
  end,
  accountIds,
}: {
  end: string;
  accountIds: number[];
}) {
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
      <Panel title={title} description={description}>
        <p
          role={current.error || previous.error ? 'alert' : 'status'}
          className="min-h-56 text-sm text-muted-foreground"
        >
          {current.error || previous.error
            ? 'Could not load spending pace.'
            : 'Loading spending pace…'}
        </p>
      </Panel>
    );
  }

  const { rows, sameDay, difference, ticks } = spendingPace(
    current.data,
    previous.data,
  );
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
            dot={
              current.data.length === 1
                ? { r: 3, fill: 'var(--color-current)' }
                : false
            }
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </Panel>
  );
}
