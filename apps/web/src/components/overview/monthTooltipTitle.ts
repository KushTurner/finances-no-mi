import { formatChartMonth } from '@/lib';

type ChartMonth = { month: string; complete: boolean };

export function monthTooltipTitle(
  payload: readonly { payload?: { month?: ChartMonth } }[],
) {
  const month = payload[0]?.payload?.month;
  return month ? formatChartMonth(month.month, month.complete) : '';
}
