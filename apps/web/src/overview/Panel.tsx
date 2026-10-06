import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from 'cn';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function Panel({
  title,
  description,
  legend,
  stat,
  table,
  className,
  children,
}: {
  title: string;
  description?: string;
  legend?: ReactNode;
  stat?: ReactNode;
  table?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
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

export function LegendItem({
  color,
  label,
  shape = 'line',
}: {
  color: string;
  label: string;
  shape?: 'line' | 'square';
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <i
        aria-hidden="true"
        className={
          shape === 'line'
            ? 'h-[3px] w-3.5 rounded-sm'
            : 'size-2.5 rounded-[3px]'
        }
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

export function ValuesTable({
  caption,
  headings,
  rows,
}: {
  caption: string;
  headings: string[];
  rows: { key: string; cells: string[] }[];
}) {
  return (
    <Table className="tabular-nums">
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {headings.map((heading, index) => (
            <TableHead
              key={heading}
              className={index > 0 ? 'text-right' : 'pl-2'}
            >
              {heading}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            {row.cells.map((cell, index) => (
              <TableCell
                key={headings[index]}
                className={index > 0 ? 'py-1.5 text-right' : 'py-1.5 pl-2'}
              >
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
