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
    <div className="flex flex-col gap-1 border-border px-6 py-5 not-first:border-t sm:not-first:border-t-0 sm:not-first:border-l">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        aria-label={`${label} ${formatted}`}
        className="font-heading text-[34px] leading-tight font-semibold tracking-tight tabular-nums"
      >
        {whole}
        {pence && (
          <span className="text-[0.55em] font-medium text-muted-foreground">
            .{pence}
          </span>
        )}
      </p>
      {change}
    </div>
  );
}
