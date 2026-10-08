import type { ImportResult, NewAccount } from '@/api';

import { AccountSetupForm } from './AccountSetupForm';
import { StatementErrors } from './StatementErrors';

type ImportOutcomeProps = {
  result: ImportResult;
  disabled: boolean;
  onAddAccount: (newAccount: NewAccount) => void;
};

export function ImportOutcome({
  result,
  disabled,
  onAddAccount,
}: ImportOutcomeProps) {
  switch (result.kind) {
    case 'completed':
      return (
        <p role="status" className="mt-2 text-sm text-positive">
          Imported into {result.imported.account_name}:{' '}
          {result.imported.new_transaction_count} new transactions,{' '}
          {result.imported.existing_transaction_count} already imported.
        </p>
      );
    case 'needsAccount':
      return (
        <AccountSetupForm
          accountType={result.accountType}
          disabled={disabled}
          onAddAccount={onAddAccount}
        />
      );
    case 'rejected':
      return (
        <p role="alert" className="mt-2 text-sm text-warning">
          {result.message}.
        </p>
      );
    case 'invalid':
      return <StatementErrors errors={result.errors} />;
  }
}
