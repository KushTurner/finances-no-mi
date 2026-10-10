import { requestJson } from './client';
import type { CountsAs, UpdatedCount } from './payers';

export type Transaction = {
  id: number;
  account_name: string;
  transaction_date: string;
  amount_pence: number;
  raw_description: string;
  source_type: string | null;
  counts_as: CountsAs | null;
  counts_as_source: 'payer' | 'human' | null;
};

export type MarkRequest = {
  transaction_ids: number[];
  counts_as: CountsAs | null;
};

export function listTransactions(payerId?: number): Promise<Transaction[]> {
  const query = payerId === undefined ? '' : `?payer=${payerId}`;
  return requestJson(`/api/transactions${query}`);
}

export function markTransactions(request: MarkRequest): Promise<UpdatedCount> {
  return requestJson('/api/transactions/counts-as', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}
