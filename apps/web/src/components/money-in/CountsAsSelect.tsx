import type { CountsAs } from '@/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countsAsChoices, countsAsLabels, isCountsAs } from '@/lib';

const UNSET = 'unset';

type CountsAsSelectProps = {
  label: string;
  value: CountsAs | null;
  unsetLabel: string;
  disabled: boolean;
  onChange: (value: CountsAs | null) => void;
};

export function CountsAsSelect({
  label,
  value,
  unsetLabel,
  disabled,
  onChange,
}: CountsAsSelectProps) {
  return (
    <Select
      value={value ?? UNSET}
      disabled={disabled}
      onValueChange={(choice) => onChange(isCountsAs(choice) ? choice : null)}
    >
      <SelectTrigger aria-label={label} className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNSET}>{unsetLabel}</SelectItem>
        {countsAsChoices.map((choice) => (
          <SelectItem key={choice} value={choice}>
            {countsAsLabels[choice]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
