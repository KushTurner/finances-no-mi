import { periodLabels, periods } from '@/lib';
import type { Period } from '@/lib';

type PeriodPickerProps = {
  period: Period;
  onChange: (period: Period) => void;
};

export function PeriodPicker({ period, onChange }: PeriodPickerProps) {
  return (
    <div
      role="group"
      aria-label="Period"
      className="inline-flex flex-wrap gap-0.5 rounded-[9px] bg-secondary p-0.5"
    >
      {periods.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === period}
          onClick={() => onChange(option)}
          className="rounded-[7px] px-3 py-1.5 text-[13px] font-medium whitespace-nowrap aria-pressed:bg-[#3a3a3e] aria-pressed:shadow-[0_1px_3px_rgb(0_0_0/50%)] sm:px-3.5"
        >
          {periodLabels[option]}
        </button>
      ))}
    </div>
  );
}
