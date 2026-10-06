import { compareTotals } from '@/lib';
import { cn } from '@/lib/utils';
import { useMoney } from '@/providers';

type TotalChangeProps = {
  current: number;
  previous: number | undefined;
  hasPrevious: boolean;
  covered: boolean;
  higherIsBetter: boolean;
  against: string;
  inPounds?: boolean;
};

export function TotalChange({
  current,
  previous,
  hasPrevious,
  covered,
  higherIsBetter,
  against,
  inPounds = false,
}: TotalChangeProps) {
  const money = useMoney();
  const comparison = compareTotals({
    current,
    previous,
    hasPrevious,
    covered,
    higherIsBetter,
    inPounds,
  });

  switch (comparison.kind) {
    case 'not-enough-history':
      return (
        <p className="text-caption text-muted-foreground">
          Not enough history to compare
        </p>
      );
    case 'comparing':
      return <p className="text-caption text-muted-foreground">Comparing…</p>;
    case 'no-previous-transactions':
      return (
        <p className="text-caption text-muted-foreground">
          No transactions in {against} to compare
        </p>
      );
    case 'nothing-to-compare':
      return (
        <p className="text-caption text-muted-foreground">
          None in {against} to compare
        </p>
      );
    case 'about-the-same':
      return (
        <p className="text-caption text-muted-foreground">
          <b className="font-semibold text-foreground">→ About the same</b> as{' '}
          {against}
        </p>
      );
    case 'changed': {
      const amount = inPounds
        ? money.wholePounds(comparison.differencePence)
        : `${comparison.percent.toFixed(0)}%`;
      return (
        <p className="text-caption text-muted-foreground">
          <b
            className={cn(
              'font-semibold',
              comparison.favourable ? 'text-positive' : 'text-destructive',
            )}
          >
            {comparison.more ? '↑' : '↓'} {amount}{' '}
            {comparison.more ? 'more' : 'less'}
          </b>{' '}
          than {against}
          <span className="sr-only">
            , {comparison.favourable ? 'favourable' : 'unfavourable'}
          </span>
        </p>
      );
    }
  }
}
