import type { CountsAs } from '@/api';

export const countsAsLabels: Record<CountsAs, string> = {
  income: 'Income',
  repayment: 'Repayment',
  own_account: 'Own account',
};

export const countsAsChoices = Object.keys(countsAsLabels) as CountsAs[];

export function isCountsAs(value: string): value is CountsAs {
  return Object.hasOwn(countsAsLabels, value);
}
