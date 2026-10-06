export const MASK = '£••••';

const pounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});
const wholePounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});
const compactPounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const longMonth = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  timeZone: 'UTC',
});
const longMonthYear = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortMonths = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export type MoneyFormat = {
  pounds: (pence: number) => string;
  wholePounds: (pence: number) => string;
  compact: (pence: number) => string;
};

export function moneyFormat(hidden: boolean): MoneyFormat {
  if (hidden) {
    return { pounds: () => MASK, wholePounds: () => MASK, compact: () => MASK };
  }
  return {
    pounds: (pence) => pounds.format(pence / 100),
    wholePounds: (pence) => wholePounds.format(Math.round(pence / 100)),
    compact: (pence) => compactPounds.format(pence / 100),
  };
}

function utc(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`);
}

function shortMonthOf(isoDate: string) {
  return shortMonths[Number(isoDate.slice(5, 7)) - 1];
}

export function formatDay(isoDate: string) {
  return `${formatDayOfMonth(isoDate)} ${shortMonthOf(isoDate)}`;
}

function formatDayWithYear(isoDate: string) {
  return `${formatDay(isoDate)} ${isoDate.slice(0, 4)}`;
}

export function formatDayOfMonth(isoDate: string) {
  return String(Number(isoDate.slice(8, 10)));
}

export function formatRange(start: string, end: string) {
  if (start === end) return formatDayWithYear(start);
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${formatDayOfMonth(start)} – ${formatDayWithYear(end)}`;
  }
  if (start.slice(0, 4) === end.slice(0, 4)) {
    return `${formatDay(start)} – ${formatDayWithYear(end)}`;
  }
  return `${formatDayWithYear(start)} – ${formatDayWithYear(end)}`;
}

export function formatMonthName(month: string) {
  return longMonth.format(utc(`${month}-01`));
}

export function formatMonthWithYear(month: string) {
  return longMonthYear.format(utc(`${month}-01`));
}

export function formatShortMonth(month: string) {
  return shortMonthOf(`${month}-01`);
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function share(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
