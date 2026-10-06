import { send, unexpectedStatus } from './client';
import type { RejectionResponse } from './client';

export type StatementError = {
  row_number: number | null;
  message: string;
};

export type ImportResponse = {
  import_id: number;
  account_name: string;
  new_transaction_count: number;
  existing_transaction_count: number;
};

type StatementErrorsResponse = {
  errors: StatementError[];
};

export type ImportResult =
  | { kind: 'completed'; imported: ImportResponse }
  | { kind: 'invalid'; errors: StatementError[] }
  | { kind: 'rejected'; message: string };

export async function importStatement(file: File): Promise<ImportResult> {
  const body = new FormData();
  body.append('file', file);

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
    default:
      throw unexpectedStatus(response);
  }
}
