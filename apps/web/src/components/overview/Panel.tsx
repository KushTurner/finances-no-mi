import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PanelProps = {
  title: string;
  description?: string;
  legend?: ReactNode;
  stat?: ReactNode;
  table?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Panel({
  title,
  description,
  legend,
  stat,
  table,
  className,
  children,
}: PanelProps) {
  const titleId = useId();
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex min-w-0 flex-col gap-3.5 rounded-2xl border bg-card px-5 pt-5 pb-4.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-[17px] font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {(legend || table) && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {legend}
            {table && (
              <button
                type="button"
                aria-pressed={showTable}
                onClick={() => setShowTable(!showTable)}
                className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-secondary aria-pressed:text-foreground"
              >
                Table
              </button>
            )}
          </div>
        )}
      </div>
      {stat && <p className="text-sm text-muted-foreground">{stat}</p>}
      {showTable && table ? table : children}
    </section>
  );
}
