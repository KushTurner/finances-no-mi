import { Link } from '@tanstack/react-router';

import type { Summary } from '@/api';
import { useMoney } from '@/providers';

type UncategorizedNoticeProps = {
  uncategorized: Summary['uncategorized'];
};

export function UncategorizedNotice({
  uncategorized,
}: UncategorizedNoticeProps) {
  const money = useMoney();
  const count = uncategorized.outgoing_count + uncategorized.incoming_count;
  if (count === 0) return null;

  return (
    <div
      role="note"
      className="flex flex-wrap items-start justify-between gap-3.5 rounded-xl border border-notice-border bg-notice px-4 py-3 text-sm text-notice-foreground"
    >
      <p className="max-w-[72ch]">
        <strong className="font-semibold">
          {count} {count === 1 ? 'transaction isn’t' : 'transactions aren’t'}{' '}
          categorized yet.
        </strong>{' '}
        {uncategorized.outgoing_count > 0 &&
          `${money.pounds(uncategorized.outgoing_pence)} going out is counted as spending and may include transfers between your accounts. `}
        {uncategorized.incoming_count > 0 &&
          `${money.pounds(uncategorized.incoming_pence)} coming in isn’t counted.`}
      </p>
      <Link
        to="/transactions"
        search={{ category: 'uncategorized' }}
        className="font-semibold underline underline-offset-2"
      >
        Review in Transactions
      </Link>
    </div>
  );
}
