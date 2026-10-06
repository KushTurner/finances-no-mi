import type { Category } from '@/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CategoryFilterProps = {
  value: string;
  categories: Category[] | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
};

export function CategoryFilter({
  value,
  categories,
  disabled,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="grid gap-2">
      <label
        htmlFor="category-filter"
        className="text-sm text-muted-foreground"
      >
        Filter by category
      </label>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger id="category-filter" className="min-w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          <SelectItem value="uncategorized">Uncategorized</SelectItem>
          {categories?.map((category) => (
            <SelectItem key={category.id} value={String(category.id)}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
