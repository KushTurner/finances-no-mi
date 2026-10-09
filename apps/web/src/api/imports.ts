import { send, unexpectedStatus } from './client';
import type { RejectionResponse } from './client';

export type StatementError = {
  position: number | null;
  message: string;
};

export type ImportResponse = {
  import_id: number;
  account_name: string;
  new_transaction_count: number;
  existing_transaction_count: number;
};

export type NewAccount = {
  preset: string;
  name: string;
};

type StatementErrorsResponse = {
  errors: StatementError[];
};

export type ImportResult =
  | { kind: 'completed'; imported: ImportResponse }
  | { kind: 'needsAccount' }
  | { kind: 'invalid'; errors: StatementError[] }
  | { kind: 'rejected'; message: string };

export async function importStatement(
  file: File,
  newAccount?: NewAccount,
): Promise<ImportResult> {
  const body = new FormData();
  body.append('file', file);
  if (newAccount) {
    body.append('preset', newAccount.preset);
    body.append('name', newAccount.name);
  }

  const response = await send('/api/imports', { method: 'POST', body });

  switch (response.status) {
    case 201: {
      const imported = (await response.json()) as ImportResponse;
      return { kind: 'completed', imported };
    }
    case 400: {
      const invalid = (await response.json()) as StatementErrorsResponse;
      return { kind: 'invalid', errors: invalid.errors };
    }
    case 409: {
      const rejection = (await response.json()) as RejectionResponse;
      return { kind: 'rejected', message: rejection.detail };
    }
    case 422:
      return { kind: 'needsAccount' };
    default:
      throw unexpectedStatus(response);
  }
}
