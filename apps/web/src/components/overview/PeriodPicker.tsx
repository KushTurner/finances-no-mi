import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { isPeriod, periodLabels, periods } from '@/lib';
import type { Period } from '@/lib';

type PeriodPickerProps = {
  period: Period;
  onChange: (period: Period) => void;
};

export function PeriodPicker({ period, onChange }: PeriodPickerProps) {
  return (
    <ToggleGroup
      type="single"
      aria-label="Period"
      value={period}
      onValueChange={(value) => {
        if (isPeriod(value)) onChange(value);
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
