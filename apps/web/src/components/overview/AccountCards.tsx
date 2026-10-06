import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Summary } from '@/api';
import { Button } from '@/components/ui/button';
import { useOverviewSearch } from '@/hooks';
import { periodLabels, toggleAccountSelection } from '@/lib';

import { AccountCard } from './AccountCard';

type AccountCardsProps = {
  accounts: Summary['accounts'];
};

export function AccountCards({ accounts }: AccountCardsProps) {
  const { period, accountIds, setAccountIds } = useOverviewSearch();
  const periodLabel = periodLabels[period];
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

  function toggleAccount(id: number) {
    setAccountIds(toggleAccountSelection(accountIds, id, accounts.length));
  }

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
          {accountIds.length > 0 && (
            <Button
              variant="link"
              onClick={() => setAccountIds([])}
              className="h-auto px-0 font-normal text-foreground"
            >
              Show all accounts
            </Button>
          )}
          {scroll.overflows && (
            <>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Previous accounts"
                disabled={scroll.atStart}
                onClick={() => scrollByCard(-1)}
                className="rounded-full"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="More accounts"
                disabled={scroll.atEnd}
                onClick={() => scrollByCard(1)}
                className="rounded-full"
              >
                <ChevronRight />
              </Button>
            </>
          )}
        </div>
      </div>
      <div
        ref={wallet}
        onScroll={measure}
        className="-my-1.5 grid snap-x snap-mandatory auto-cols-[86%] grid-flow-col gap-5 overflow-x-auto py-1.5 scrollbar-none sm:auto-cols-[calc((100%-20px)/2)] lg:auto-cols-[calc((100%-40px)/3)]"
      >
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            periodLabel={periodLabel}
            selected={accountIds.includes(account.id)}
            dimmed={accountIds.length > 0 && !accountIds.includes(account.id)}
            onToggle={() => toggleAccount(account.id)}
          />
        ))}
      </div>
    </section>
  );
}
