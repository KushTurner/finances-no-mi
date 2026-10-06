import type { Category } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CategoryAssignmentProps = {
  selectedCount: number;
  categories: Category[];
  choice: string;
  pending: boolean;
  error: Error | null;
  notice: string;
  onChoiceChange: (choice: string) => void;
  onApply: () => void;
  onDeselectAll: () => void;
};

export function CategoryAssignment({
  selectedCount,
  categories,
  choice,
  pending,
  error,
  notice,
  onChoiceChange,
  onApply,
  onDeselectAll,
}: CategoryAssignmentProps) {
  const chosenCategory = categories.find(
    (category) => String(category.id) === choice,
  );

  return (
    <div className="sticky top-0 z-10 mt-2 bg-background py-4">
      <Card role="region" aria-label="Categorize selected transactions">
        <CardContent>
          <p className="text-sm font-medium">{selectedCount} selected</p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <label
                htmlFor="category-choice"
                className="text-sm text-muted-foreground"
              >
                Category for selection
              </label>
              <Select
                value={choice}
                disabled={pending}
                onValueChange={onChoiceChange}
              >
                <SelectTrigger id="category-choice" className="min-w-52">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="clear">Clear category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={selectedCount === 0 || choice === '' || pending}
              onClick={onApply}
            >
              {pending ? 'Saving…' : 'Apply to selected'}
            </Button>
            {selectedCount > 0 && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={onDeselectAll}
              >
                Deselect all
              </Button>
            )}
          </div>
          {chosenCategory && (
            <p className="mt-3 text-sm text-muted-foreground">
              {chosenCategory.definition}
            </p>
          )}
          {choice === 'clear' && (
            <p className="mt-3 text-sm text-muted-foreground">
              Selected transactions will become uncategorized.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Could not save categories. {error.message}. Try again.
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 text-sm text-positive">
              {notice}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
