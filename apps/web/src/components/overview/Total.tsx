import type { ReactNode } from 'react';

import { splitPence } from '@/lib';
import { useMoney } from '@/providers';

type TotalProps = {
  label: string;
  value: number;
  change: ReactNode;
};

export function Total({ label, value, change }: TotalProps) {
  const money = useMoney();
  const formatted = money.pounds(value);
  const { whole, pence } = splitPence(formatted);

  return (
    <div className="flex flex-col gap-1 border-border px-6 py-5 not-first:border-t sm:even:border-l sm:[&:nth-child(2)]:border-t-0 lg:not-first:border-t-0 lg:not-first:border-l">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p
        aria-label={`${label} ${formatted}`}
        className="font-heading text-figure leading-tight font-semibold tracking-tight tabular-nums"
      >
        {whole}
        {pence && (
          <span className="text-pence font-medium text-muted-foreground">
            .{pence}
          </span>
        )}
      </p>
      {change}
    </div>
  );
}
