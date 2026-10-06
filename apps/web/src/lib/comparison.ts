import { percentChange } from './format';

export type TotalComparison =
  | { kind: 'not-enough-history' }
  | { kind: 'comparing' }
  | { kind: 'no-previous-transactions' }
  | { kind: 'nothing-to-compare' }
  | { kind: 'about-the-same' }
  | {
      kind: 'changed';
      more: boolean;
      favourable: boolean;
      differencePence: number;
      percent: number;
    };

type TotalComparisonInput = {
  current: number;
  previous: number | undefined;
  hasPrevious: boolean;
  covered: boolean;
  higherIsBetter: boolean;
  inPounds: boolean;
};

export function compareTotals({
  current,
  previous,
  hasPrevious,
  covered,
  higherIsBetter,
  inPounds,
}: TotalComparisonInput): TotalComparison {
  if (!covered) return { kind: 'not-enough-history' };
  if (previous === undefined) return { kind: 'comparing' };
  if (!hasPrevious) return { kind: 'no-previous-transactions' };

  const difference = current - previous;
  const percent = percentChange(current, previous);
  if (!inPounds && percent === null) return { kind: 'nothing-to-compare' };

  const flat = inPounds
    ? Math.abs(difference) < 100
    : Math.abs(percent ?? 0) < 0.5;
  if (flat) return { kind: 'about-the-same' };

  return {
    kind: 'changed',
    more: difference > 0,
    favourable: difference > 0 === higherIsBetter,
    differencePence: Math.abs(difference),
    percent: Math.abs(percent ?? 0),
  };
}
