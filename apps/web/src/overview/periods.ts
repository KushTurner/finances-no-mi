import type { DateRange } from '@/api';

export const periods = [
  'this_month',
  'last_month',
  'last_90_days',
  'this_year',
  'last_12_months',
] as const;

export type Period = (typeof periods)[number];

export const periodLabels: Record<Period, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  last_90_days: 'Last 90 days',
  this_year: 'This year',
  last_12_months: 'Last 12 months',
};

const DAY_MS = 86_400_000;

export function isPeriod(value: unknown): value is Period {
  return periods.includes(value as Period);
}

function toUtc(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcDate(year: number, monthIndex: number, day: number) {
  return toIsoDate(new Date(Date.UTC(year, monthIndex, day)));
}

export function localToday(now = new Date()) {
  return utcDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(isoDate: string, days: number) {
  return toIsoDate(new Date(toUtc(isoDate).getTime() + days * DAY_MS));
}

export function monthOf(isoDate: string) {
  return isoDate.slice(0, 7);
}

function startOfMonth(isoDate: string) {
  const date = toUtc(isoDate);
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function endOfMonth(isoDate: string) {
  const date = toUtc(isoDate);
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
}

function previousMonth(isoDate: string): DateRange {
  const date = toUtc(isoDate);
  return {
    from: utcDate(date.getUTCFullYear(), date.getUTCMonth() - 1, 1),
    to: utcDate(date.getUTCFullYear(), date.getUTCMonth(), 0),
  };
}

export function isLastDayOfMonth(isoDate: string) {
  return endOfMonth(isoDate) === isoDate;
}

export function periodRange(period: Period, today: string): DateRange {
  switch (period) {
    case 'this_month':
      return { from: startOfMonth(today), to: today };
    case 'last_month':
      return previousMonth(today);
    case 'last_90_days':
      return { from: addDays(today, -89), to: today };
    case 'this_year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'last_12_months':
      return { from: addDays(today, -364), to: today };
  }
}

export function comparisonRange(
  period: Period,
  range: DateRange,
): DateRange | null {
  switch (period) {
    case 'last_month':
      return previousMonth(range.from);
    case 'last_90_days':
      return { from: addDays(range.from, -90), to: addDays(range.from, -1) };
    case 'last_12_months':
      return { from: addDays(range.from, -365), to: addDays(range.from, -1) };
    case 'this_month':
    case 'this_year':
      return null;
  }
}

export function chartMonths(end: string): DateRange {
  const date = toUtc(end);
  return {
    from: monthOf(utcDate(date.getUTCFullYear(), date.getUTCMonth() - 11, 1)),
    to: monthOf(end),
  };
}

export function paceRanges(end: string) {
  return {
    current: { from: startOfMonth(end), to: end },
    previous: previousMonth(end),
  };
}

export function monthOverlaps(month: string, range: DateRange) {
  const first = `${month}-01`;
  return first <= range.to && endOfMonth(first) >= range.from;
}
