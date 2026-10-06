import type { Summary } from '@/api';
import { formatDay, splitPence } from '@/lib';
import { cn } from '@/lib/utils';
import { useMoney } from '@/providers';

type AccountCardProps = {
  account: Summary['accounts'][number];
  periodLabel: string;
  selected: boolean;
  dimmed: boolean;
  onToggle: () => void;
};

export function AccountCard({
  account,
  periodLabel,
  selected,
  dimmed,
  onToggle,
}: AccountCardProps) {
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
        'relative flex aspect-[85.6/53.98] snap-start flex-col justify-between overflow-hidden rounded-2xl bg-linear-135 from-metal-light via-metal to-metal-dark px-5 py-4.5 text-left text-white shadow-account-card transition duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected && 'ring-2 ring-white/80 ring-inset',
        dimmed && 'opacity-40 saturate-50',
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 account-card-sheen"
      />
      <span className="relative text-title font-semibold tracking-tight">
        {account.name}
      </span>
      <span className="relative">
        <span className="block text-xs opacity-75">
          Spent · {periodLabel.toLowerCase()}
        </span>
        <span className="block font-heading text-3xl leading-tight font-semibold tracking-tight tabular-nums">
          {whole}
          {pence && (
            <span className="text-pence font-medium opacity-75">.{pence}</span>
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
