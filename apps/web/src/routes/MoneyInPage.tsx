import {
  EmptyState,
  LoadError,
  LoadingState,
  PageHeading,
} from '@/components/common';
import { PayerRow } from '@/components/money-in';
import { Card } from '@/components/ui/card';
import { usePayersQuery } from '@/hooks';

export function MoneyInPage() {
  const payers = usePayersQuery();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeading
        title="Money in"
        description="Choose how money from each payer counts. Repayments reduce your spending, and own-account transfers are left out of every total."
      />

      {payers.isError && (
        <LoadError
          className="mt-8"
          message={`Could not load payers. ${payers.error.message}.`}
          onRetry={() => void payers.refetch()}
        />
      )}
      {payers.isPending && (
        <LoadingState className="mt-8">Loading payers…</LoadingState>
      )}
      {payers.isSuccess &&
        (payers.data.length === 0 ? (
          <EmptyState className="mt-8">
            No money in yet. Import a statement to get started.
          </EmptyState>
        ) : (
          <Card className="mt-8 py-0">
            <ul aria-label="Payers" className="flex flex-col">
              {payers.data.map((payer) => (
                <PayerRow key={payer.id} payer={payer} />
              ))}
            </ul>
          </Card>
        ))}
    </main>
  );
}
