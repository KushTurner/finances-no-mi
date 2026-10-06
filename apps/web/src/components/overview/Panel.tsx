import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import { Toggle } from '@/components/ui/toggle';
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
          <h2 id={titleId} className="text-title font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-caption text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {(legend || table) && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {legend}
            {table && (
              <Toggle
                variant="outline"
                size="sm"
                pressed={showTable}
                onPressedChange={setShowTable}
                className="h-auto min-w-0 rounded-full border-border px-2.5 py-0.5 text-xs font-normal text-muted-foreground hover:bg-transparent data-[state=on]:bg-secondary data-[state=on]:text-foreground"
              >
                Table
              </Toggle>
            )}
          </div>
        )}
      </div>
      {stat && <p className="text-sm text-muted-foreground">{stat}</p>}
      {showTable && table ? table : children}
    </section>
  );
}
