import { Input } from '@/components/ui/input';

type DescriptionSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DescriptionSearch({ value, onChange }: DescriptionSearchProps) {
  return (
    <div className="grid gap-2">
      <label
        htmlFor="description-search"
        className="text-sm text-muted-foreground"
      >
        Search descriptions
      </label>
      <Input
        id="description-search"
        type="search"
        placeholder="e.g. Tesco"
        autoComplete="off"
        className="w-64"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
