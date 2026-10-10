import type { Category } from '@/api';

import { CategoryFilter } from './CategoryFilter';
import { DescriptionSearch } from './DescriptionSearch';

type TransactionFiltersProps = {
  category: string;
  search: string;
  categories: Category[] | undefined;
  shownCount: string | null;
  disabled: boolean;
  onCategoryChange: (category: string) => void;
  onSearchChange: (search: string) => void;
};

export function TransactionFilters({
  category,
  search,
  categories,
  shownCount,
  disabled,
  onCategoryChange,
  onSearchChange,
}: TransactionFiltersProps) {
  return (
    <div className="mt-8 flex flex-wrap items-end gap-4">
      <CategoryFilter
        value={category}
        categories={categories}
        disabled={disabled}
        onChange={onCategoryChange}
      />
      <DescriptionSearch
        value={search}
        disabled={disabled}
        onChange={onSearchChange}
      />
      {shownCount && (
        <p className="pb-1.5 text-sm text-muted-foreground">{shownCount}</p>
      )}
    </div>
  );
}
