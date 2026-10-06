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
