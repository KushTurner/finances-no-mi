import type { DailySpending, DateRange, MonthlySummary, Summary } from '@/api';

import { axisTicks, formatShortMonth } from './format';
import { monthOverlaps } from './periods';

export const uncategorizedLabel = 'Not categorized yet';

export function categorySpendingRows(summary: Summary) {
  const rows = summary.categories.map((category) => ({
    key: String(category.id),
    name: category.name,
    spent: category.spent_pence,
    muted: false,
  }));
  if (summary.uncategorized.outgoing_pence > 0) {
    rows.push({
      key: 'uncategorized',
      name: uncategorizedLabel,
      spent: summary.uncategorized.outgoing_pence,
      muted: true,
    });
  }
  const largest = Math.max(1, ...rows.map((row) => row.spent));
  return rows.map((row) => ({
    ...row,
    barPercent: (Math.max(row.spent, 0) / largest) * 100,
  }));
}

export function monthlySpendingChart(
  summary: MonthlySummary,
  range: DateRange,
) {
  const rows = summary.months.map((month) => ({
    month,
    label: formatShortMonth(month.month),
    spent: month.spent_pence,
    highlighted: monthOverlaps(month.month, range),
  }));
  return {
    rows,
    hasAverage: summary.months.some((month) => month.complete),
    ticks: axisTicks(
      Math.max(summary.average_spent_pence, ...rows.map((row) => row.spent)),
    ),
  };
}

export function incomeAndSpendingChart(summary: MonthlySummary) {
  const rows = summary.months.map((month) => ({
    month,
    label: formatShortMonth(month.month),
    income: month.income_pence,
    spent: month.spent_pence,
  }));
  return {
    rows,
    completeMonths: summary.months.filter((month) => month.complete).length,
    ticks: axisTicks(
      Math.max(...rows.flatMap((row) => [row.income, row.spent])),
    ),
  };
}

export function spendingPace(current: DailySpending, previous: DailySpending) {
  const days = Math.max(current.length, previous.length);
  const rows = Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    current: current[index]?.running_spent_pence,
    previous: previous[index]?.running_spent_pence,
  }));
  const latest = current.at(-1)?.running_spent_pence ?? 0;
  const sameDay = Math.min(current.length, previous.length);
  const previousAtSameDay = previous[sameDay - 1]?.running_spent_pence ?? 0;
  return {
    rows,
    sameDay,
    difference: latest - previousAtSameDay,
    ticks: axisTicks(
      Math.max(...rows.flatMap((row) => [row.current ?? 0, row.previous ?? 0])),
    ),
  };
}

export type MonthlySpendingChartData = ReturnType<typeof monthlySpendingChart>;

export type IncomeAndSpendingChartData = ReturnType<
  typeof incomeAndSpendingChart
>;

export type SpendingPaceData = ReturnType<typeof spendingPace>;
