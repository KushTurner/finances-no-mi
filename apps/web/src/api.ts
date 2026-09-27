export type Account = {
  id: number;
  name: string;
  institution: 'amex' | 'natwest' | 'nationwide';
  account_type: 'current_account' | 'credit_card' | 'savings';
};

export type StatementError = {
  row_number: number | null;
  message: string;
};

export type ImportResult =
  | {
      kind: 'completed';
      newTransactionCount: number;
      existingTransactionCount: number;
    }
  | { kind: 'duplicate' }
  | { kind: 'invalid'; errors: StatementError[] }
  | { kind: 'accountNotFound' };

type ImportResponse = {
  import_id: number;
  new_transaction_count: number;
  existing_transaction_count: number;
};

type StatementErrorsResponse = {
  errors: StatementError[];
};

export async function listAccounts(): Promise<Account[]> {
  const response = await fetch('/api/accounts');
  if (!response.ok) {
    throw new Error(`Loading accounts failed with status ${response.status}`);
  }
  return (await response.json()) as Account[];
}

export async function importStatement(
  accountId: number,
  file: File,
): Promise<ImportResult> {
  const body = new FormData();
  body.append('file', file);

  const response = await fetch(`/api/accounts/${accountId}/imports`, {
    method: 'POST',
    body,
  });

  switch (response.status) {
    case 201: {
      const imported = (await response.json()) as ImportResponse;
      return {
        kind: 'completed',
        newTransactionCount: imported.new_transaction_count,
        existingTransactionCount: imported.existing_transaction_count,
      };
    }
    case 400: {
      const invalid = (await response.json()) as StatementErrorsResponse;
      return { kind: 'invalid', errors: invalid.errors };
    }
    case 404:
      return { kind: 'accountNotFound' };
    case 409:
      return { kind: 'duplicate' };
    default:
      throw new Error(`Import failed with status ${response.status}`);
  }
}
