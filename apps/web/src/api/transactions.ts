import { requestJson } from './client';

export type Transaction = {
  id: number;
  account_name: string;
  transaction_date: string;
  amount_pence: number;
  raw_description: string;
  source_type: string | null;
};

export function listTransactions(): Promise<Transaction[]> {
  return requestJson('/api/transactions');
}
