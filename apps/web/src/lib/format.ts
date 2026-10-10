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

function utc(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`);
}

function shortMonthOf(isoDate: string) {
  return shortMonths[Number(isoDate.slice(5, 7)) - 1];
}

export function formatDay(isoDate: string) {
  return `${formatDayOfMonth(isoDate)} ${shortMonthOf(isoDate)}`;
}

export function formatDayWithYear(isoDate: string) {
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

export function axisTicks(largestPence: number) {
  const largest = Math.max(largestPence, 100);
  const roughStep = largest / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((multiple) => multiple * magnitude)
      .find((candidate) => candidate >= roughStep) ?? 10 * magnitude;
  return Array.from(
    { length: Math.ceil(largest / step) + 1 },
    (_, index) => index * step,
  );
}

export function formatCount(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatShownRange(
  start: string,
  end: string,
  requestedEnd: string,
) {
  const formatted = formatRange(start, end);
  return end < requestedEnd
    ? `${formatted} · up to your latest transaction`
    : formatted;
}

export function formatChartMonth(month: string, complete: boolean) {
  return `${formatMonthWithYear(month)}${complete ? '' : ' (incomplete)'}`;
}

export function formatShownCount(shown: number, total: number) {
  const totalCount = formatCount(total, 'transaction');
  return shown === total ? totalCount : `${shown} of ${totalCount}`;
}
