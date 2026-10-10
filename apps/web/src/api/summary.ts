import { requestJson } from './client';

export type DateRange = { from: string; to: string };

export type Summary = {
  start: string;
  end: string;
  transaction_count: number;
  spent_pence: number;
  income_pence: number;
  net_pence: number;
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
  months: DateRange,
  accountIds: number[],
): Promise<MonthlySummary> {
  return requestJson(summaryUrl('/months', months, accountIds));
}

export function getDailySpending(
  range: DateRange,
  accountIds: number[],
): Promise<DailySpending> {
  return requestJson(summaryUrl('/days', range, accountIds));
}
