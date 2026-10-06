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

export type DateRange = { from: string; to: string };

export type Summary = {
  start: string;
  end: string;
  transaction_count: number;
  spent_pence: number;
  income_pence: number;
  net_pence: number;
  uncategorized: {
    outgoing_count: number;
    outgoing_pence: number;
    incoming_count: number;
    incoming_pence: number;
  };
  categories: { id: number; name: string; spent_pence: number }[];
  accounts: {
    id: number;
    name: string;
    spent_pence: number;
    earliest_transaction_date: string | null;
    latest_transaction_date: string | null;
  }[];
  largest_payments: {
    id: number;
    date: string;
    description: string;
    account_name: string;
    amount_pence: number;
  }[];
};

export type MonthlySummary = {
  months: {
    month: string;
    spent_pence: number;
    income_pence: number;
    complete: boolean;
  }[];
  average_spent_pence: number;
  kept_pence: number;
};

export type DailySpending = {
  date: string;
  spent_pence: number;
  running_spent_pence: number;
}[];

function summaryUrl(path: string, range: DateRange, accountIds: number[]) {
  const query = new URLSearchParams(range);
  for (const id of accountIds) query.append('account_id', String(id));
  return `/api/summary${path}?${query.toString()}`;
}

export function getSummary(
  range: DateRange,
  accountIds: number[],
): Promise<Summary> {
  return requestJson(summaryUrl('', range, accountIds));
}

export function getMonthlySummary(
  range: DateRange,
  accountIds: number[],
): Promise<MonthlySummary> {
  return requestJson(summaryUrl('/months', range, accountIds));
}

export function getDailySpending(
  range: DateRange,
  accountIds: number[],
): Promise<DailySpending> {
  return requestJson(summaryUrl('/days', range, accountIds));
}
