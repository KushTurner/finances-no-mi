import { requestJson } from './client';

export type CountsAs = 'income' | 'repayment' | 'own_account';

export type Payer = {
  id: number;
  name: string;
  payment_count: number;
  received_pence: number;
  latest_payment_date: string;
  counts_as: CountsAs | null;
};

export type PayerRuleRequest = {
  payerId: number;
  counts_as: CountsAs | null;
};

export type UpdatedCount = {
  updated_count: number;
};

export function listPayers(): Promise<Payer[]> {
  return requestJson('/api/payers');
}

export function setPayerRule({
  payerId,
  counts_as,
}: PayerRuleRequest): Promise<UpdatedCount> {
  return requestJson(`/api/payers/${payerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counts_as }),
  });
}
