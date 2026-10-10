import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import type { Payer } from '@/api';
import { Button } from '@/components/ui/button';
import { useSetPayerRuleMutation } from '@/hooks';
import { formatCount, formatDayWithYear, formatSignedPounds } from '@/lib';
import { cn } from '@/lib/utils';

import { CountsAsSelect } from './CountsAsSelect';
import { PayerPayments } from './PayerPayments';

type PayerRowProps = {
  payer: Payer;
};

export function PayerRow({ payer }: PayerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const rule = useSetPayerRuleMutation();
  const paymentsId = `payer-${payer.id}-payments`;

  return (
    <li className="flex flex-col gap-3 px-4 py-3 not-first:border-t">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Show payments from ${payer.name}`}
          aria-expanded={expanded}
          aria-controls={paymentsId}
          onClick={() => setExpanded((current) => !current)}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn('transition-transform', expanded && 'rotate-180')}
          />
        </Button>
        <div className="min-w-48 flex-1">
          <p className="font-medium break-words">{payer.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatCount(payer.payment_count, 'payment')} · latest{' '}
            {formatDayWithYear(payer.latest_payment_date)}
          </p>
        </div>
        <p className="text-sm text-positive tabular-nums">
          {formatSignedPounds(payer.received_pence)}
        </p>
        <CountsAsSelect
          label={`Money from ${payer.name} counts as`}
          value={payer.counts_as}
          unsetLabel="Not decided"
          disabled={rule.isPending}
          onChange={(countsAs) =>
            rule.mutate({ payerId: payer.id, counts_as: countsAs })
          }
        />
      </div>
      {rule.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not save. {rule.error.message}. Try again.
        </p>
      )}
      {expanded && (
        <div id={paymentsId} className="pl-11">
          <PayerPayments payerId={payer.id} />
        </div>
      )}
    </li>
  );
}
