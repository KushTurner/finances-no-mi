import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Summary } from '@/api';

import { AccountCard } from './AccountCard';

const scrollButton =
  'grid size-7.5 place-items-center rounded-full bg-secondary text-foreground transition-opacity disabled:opacity-35';

type AccountCardsProps = {
  accounts: Summary['accounts'];
  selectedIds: number[];
  periodLabel: string;
  onToggle: (id: number) => void;
  onClear: () => void;
};

export function AccountCards({
  accounts,
  selectedIds,
  periodLabel,
  onToggle,
  onClear,
}: AccountCardsProps) {
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
