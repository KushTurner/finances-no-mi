import type { Category } from '@/api';

export function categoryName(categories: Category[], id: number | null) {
  return (
    categories.find((category) => category.id === id)?.name ?? 'Uncategorized'
  );
}
