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
  value: CountsAs | null | undefined;
  unsetLabel: string;
  placeholder?: string;
  disabled: boolean;
  onChange: (value: CountsAs | null) => void;
};

export function CountsAsSelect({
  label,
  value,
  unsetLabel,
  placeholder,
  disabled,
  onChange,
}: CountsAsSelectProps) {
  return (
    <Select
      value={value === undefined ? '' : (value ?? UNSET)}
      disabled={disabled}
      onValueChange={(choice) => onChange(isCountsAs(choice) ? choice : null)}
    >
      <SelectTrigger aria-label={label} className="w-52">
        <SelectValue placeholder={placeholder} />
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
