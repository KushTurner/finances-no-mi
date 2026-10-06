import type { Summary } from '@/api';
import { useOverviewSearch } from '@/hooks';
import { categorySpendingRows, periodLabels, share } from '@/lib';
import { cn } from '@/lib/utils';
import { useMoney } from '@/providers';

import { Panel } from './Panel';
import { ValuesTable } from './ValuesTable';

type CategorySpendingProps = {
  summary: Summary;
};

export function CategorySpending({ summary }: CategorySpendingProps) {
  const { period } = useOverviewSearch();
  const periodLabel = periodLabels[period];
  const money = useMoney();
  const rows = categorySpendingRows(summary);

  return (
    <Panel
      title="Spending by category"
      description={`${periodLabel} · refunds reduce their category`}
      table={
        rows.length > 0 && (
          <ValuesTable
            caption="Spending by category"
            headings={['Category', 'Spent', 'Share']}
            rows={rows.map((row) => ({
              key: row.key,
              cells: [
                row.name,
                money.pounds(row.spent),
                share(row.spent, summary.spent_pence),
              ],
            }))}
          />
        )
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No spending in this period.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li
              key={row.key}
              className={cn(
                'grid grid-cols-[minmax(90px,150px)_minmax(0,1fr)_auto] items-center gap-3 py-0.5 text-caption',
                row.muted && 'mt-1 border-t pt-3.5',
              )}
            >
              <span
                title={row.name}
                className={cn(
                  'truncate',
                  row.muted ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {row.name}
              </span>
              <span aria-hidden="true" className="h-2.5">
                <span
                  className={cn(
                    'block h-full min-w-0.5 rounded-r',
                    row.muted ? 'bg-series-muted' : 'bg-series-spend',
                  )}
                  style={{ width: `${row.barPercent.toFixed(1)}%` }}
                />
              </span>
              <span className="text-right whitespace-nowrap tabular-nums">
                {money.wholePounds(row.spent)}
                <small className="ml-1.5 inline-block min-w-[4ch] text-xs text-muted-foreground">
                  {share(row.spent, summary.spent_pence)}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
