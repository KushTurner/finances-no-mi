import type { Summary } from '@/api';

import { Total } from './Total';
import { TotalChange } from './TotalChange';

type Comparison = {
  label: string;
  summary: Summary | undefined;
  covered: boolean;
};

type TotalsProps = {
  summary: Summary;
  comparison: Comparison | null;
};

export function Totals({ summary, comparison }: TotalsProps) {
  const previous = comparison?.summary;

  return (
    <section
      aria-label="Totals"
      className="grid rounded-2xl border bg-card sm:grid-cols-3"
    >
      <Total
        label="Spent"
        value={summary.spent_pence}
        change={
          comparison && (
            <TotalChange
              current={summary.spent_pence}
              previous={previous?.spent_pence}
              hasPrevious={Boolean(previous?.transaction_count)}
              covered={comparison.covered}
              higherIsBetter={false}
              against={comparison.label}
            />
          )
        }
      />
      <Total
        label="Income"
        value={summary.income_pence}
        change={
          comparison && (
            <TotalChange
              current={summary.income_pence}
              previous={previous?.income_pence}
              hasPrevious={Boolean(previous?.transaction_count)}
              covered={comparison.covered}
              higherIsBetter
              against={comparison.label}
            />
          )
        }
      />
      <Total
        label="Net"
        value={summary.net_pence}
        change={
          comparison && (
            <TotalChange
              current={summary.net_pence}
              previous={previous?.net_pence}
              hasPrevious={Boolean(previous?.transaction_count)}
              covered={comparison.covered}
              higherIsBetter
              against={comparison.label}
              inPounds
            />
          )
        }
      />
    </section>
  );
}
