import type { CountsAs, Transaction } from '@/api';

export const countsAsLabels: Record<CountsAs, string> = {
  income: 'Income',
  repayment: 'Repayment',
  own_account: 'Own account',
  savings: 'Savings & investments',
};

export const countsAsChoices = Object.keys(countsAsLabels) as CountsAs[];

export function isCountsAs(value: string): value is CountsAs {
  return Object.hasOwn(countsAsLabels, value);
}

export function countsAsLabel(transaction: Transaction) {
  if (transaction.counts_as) return countsAsLabels[transaction.counts_as];
  return transaction.amount_pence < 0 ? 'Spending' : 'Income';
}
