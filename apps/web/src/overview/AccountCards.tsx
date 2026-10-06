import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Summary } from '@/api';
import { formatDay, splitPence } from '@/lib';
import { cn } from '@/lib/utils';

import { useMoney } from './money';

type Account = Summary['accounts'][number];

const scrollButton =
  'grid size-7.5 place-items-center rounded-full bg-secondary text-foreground transition-opacity disabled:opacity-35';

export function AccountCards({
  accounts,
  selectedIds,
  periodLabel,
  onToggle,
  onClear,
}: {
  accounts: Account[];
  selectedIds: number[];
  periodLabel: string;
  onToggle: (id: number) => void;
  onClear: () => void;
}) {
  const wallet = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({
    overflows: false,
    atStart: true,
    atEnd: true,
  });

  const measure = useCallback(() => {
    const element = wallet.current;
    if (!element) return;
    setScroll({
      overflows: element.scrollWidth - element.clientWidth > 12,
      atStart: element.scrollLeft <= 4,
      atEnd:
        element.scrollLeft + element.clientWidth >= element.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined' || !wallet.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(wallet.current);
    return () => observer.disconnect();
  }, [measure, accounts.length]);

  function scrollByCard(direction: 1 | -1) {
    const element = wallet.current;
    const card = element?.querySelector('button');
    if (!element || !card) return;
    element.scrollBy({
      left: direction * (card.offsetWidth + 20),
      behavior: 'smooth',
    });
  }

  return (
    <section aria-labelledby="accounts-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="accounts-heading"
          className="text-xl font-semibold tracking-tight"
        >
          Accounts
        </h2>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-sm text-foreground underline-offset-4 hover:underline"
            >
              Show all accounts
            </button>
          )}
          {scroll.overflows && (
            <>
              <button
                type="button"
                aria-label="Previous accounts"
                disabled={scroll.atStart}
                onClick={() => scrollByCard(-1)}
                className={scrollButton}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="More accounts"
                disabled={scroll.atEnd}
                onClick={() => scrollByCard(1)}
                className={scrollButton}
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
      <div
        ref={wallet}
        onScroll={measure}
        className="-my-1.5 grid snap-x snap-mandatory auto-cols-[86%] grid-flow-col gap-5 overflow-x-auto py-1.5 [scrollbar-width:none] sm:auto-cols-[calc((100%-20px)/2)] lg:auto-cols-[calc((100%-40px)/3)]"
      >
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            periodLabel={periodLabel}
            selected={selectedIds.includes(account.id)}
            dimmed={selectedIds.length > 0 && !selectedIds.includes(account.id)}
            onToggle={() => onToggle(account.id)}
          />
        ))}
      </div>
    </section>
  );
}

function AccountCard({
  account,
  periodLabel,
  selected,
  dimmed,
  onToggle,
}: {
  account: Account;
  periodLabel: string;
  selected: boolean;
  dimmed: boolean;
  onToggle: () => void;
}) {
  const money = useMoney();
  const spent = money.pounds(account.spent_pence);
  const { whole, pence } = splitPence(spent);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${account.name}, spent ${spent}`}
      onClick={onToggle}
      className={cn(
        'relative flex aspect-[85.6/53.98] snap-start flex-col justify-between overflow-hidden rounded-2xl bg-linear-135 from-[#6b6b70] via-[#3a3a3c] to-[#1c1c1e] px-5 py-4.5 text-left text-white shadow-[0_1px_2px_rgb(0_0_0/12%),0_10px_30px_-12px_rgb(0_0_0/45%)] transition duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected && 'ring-2 ring-white/80 ring-inset',
        dimmed && 'opacity-40 saturate-50',
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgb(255_255_255/22%),transparent_55%)]"
      />
      <span className="relative text-[17px] font-semibold tracking-tight">
        {account.name}
      </span>
      <span className="relative">
        <span className="block text-xs opacity-75">
          Spent · {periodLabel.toLowerCase()}
        </span>
        <span className="block font-heading text-3xl leading-tight font-semibold tracking-tight tabular-nums">
          {whole}
          {pence && (
            <span className="text-[0.6em] font-medium opacity-75">
              .{pence}
            </span>
          )}
        </span>
      </span>
      <span className="relative text-xs opacity-85">
        {account.latest_transaction_date
          ? `Latest transaction ${formatDay(account.latest_transaction_date)}`
          : 'No transactions yet'}
      </span>
    </button>
  );
}
