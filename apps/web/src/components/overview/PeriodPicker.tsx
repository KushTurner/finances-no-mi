import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useOverviewSearch } from '@/hooks';
import { isPeriod, periodLabels, periods } from '@/lib';

export function PeriodPicker() {
  const { period, setPeriod } = useOverviewSearch();
  return (
    <ToggleGroup
      type="single"
      aria-label="Period"
      value={period}
      onValueChange={(value) => {
        if (isPeriod(value)) setPeriod(value);
      }}
      spacing={0.5}
      className="flex-wrap rounded-md bg-secondary p-0.5"
    >
      {periods.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          className="h-auto rounded-sm px-3 py-1.5 text-caption sm:px-3.5 data-[state=on]:bg-control-active data-[state=on]:shadow-control"
        >
          {periodLabels[option]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
