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

export type Category = {
  id: number;
  name: string;
  definition: string;
};

export type Transaction = {
  id: number;
  account_name: string;
  transaction_date: string;
  amount_pence: number;
  raw_description: string;
  source_type: string | null;
  category_id: number | null;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init).catch(() => {
    throw new Error('The API could not be reached');
  });
  if (!response.ok) {
    if (response.status === 400) {
      const error = (await response.json()) as RejectionResponse;
      throw new Error(error.detail);
    }
    throw new Error(`The API responded with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function listCategories(): Promise<Category[]> {
  return requestJson('/api/categories');
}

export function listTransactions(category: string): Promise<Transaction[]> {
  const query =
    category === 'all' ? '' : `?category=${encodeURIComponent(category)}`;
  return requestJson(`/api/transactions${query}`);
}

export function assignCategory(
  transactionIds: number[],
  categoryId: number | null,
) {
  return requestJson<{ updated_count: number }>('/api/transactions/category', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction_ids: transactionIds,
      category_id: categoryId,
    }),
  });
}
