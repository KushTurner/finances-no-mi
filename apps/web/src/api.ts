export type StatementError = {
  row_number: number | null;
  message: string;
};

export type ImportResult =
  | {
      kind: 'completed';
      accountName: string;
      newTransactionCount: number;
      existingTransactionCount: number;
    }
  | { kind: 'invalid'; errors: StatementError[] }
  | { kind: 'rejected'; message: string };

type ImportResponse = {
  import_id: number;
  account_name: string;
  new_transaction_count: number;
  existing_transaction_count: number;
};

type StatementErrorsResponse = {
  errors: StatementError[];
};

type RejectionResponse = {
  detail: string;
};

export async function importStatement(file: File): Promise<ImportResult> {
  const body = new FormData();
  body.append('file', file);

  const response = await fetch('/api/imports', { method: 'POST', body }).catch(
    () => {
      throw new Error('The API could not be reached');
    },
  );

  switch (response.status) {
    case 201: {
      const imported = (await response.json()) as ImportResponse;
      return {
        kind: 'completed',
        accountName: imported.account_name,
        newTransactionCount: imported.new_transaction_count,
        existingTransactionCount: imported.existing_transaction_count,
      };
    }
    case 400: {
      const invalid = (await response.json()) as StatementErrorsResponse;
      return { kind: 'invalid', errors: invalid.errors };
    }
    case 409: {
      const rejection = (await response.json()) as RejectionResponse;
      return { kind: 'rejected', message: rejection.detail };
    }
    default:
      throw new Error(`The API responded with status ${response.status}`);
  }
}
