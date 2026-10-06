import { requestJson } from './client';

export type Transaction = {
  id: number;
  account_name: string;
  transaction_date: string;
  amount_pence: number;
  raw_description: string;
  source_type: string | null;
  category_id: number | null;
};

export type CategoryAssignmentRequest = {
  transaction_ids: number[];
  category_id: number | null;
};

export type CategoryAssignmentResponse = {
  updated_count: number;
};

export function listTransactions(category: string): Promise<Transaction[]> {
  const query =
    category === 'all' ? '' : `?category=${encodeURIComponent(category)}`;
  return requestJson(`/api/transactions${query}`);
}

export function assignCategory(
  request: CategoryAssignmentRequest,
): Promise<CategoryAssignmentResponse> {
  return requestJson('/api/transactions/category', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}
