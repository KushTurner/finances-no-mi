import { Eye, EyeOff } from 'lucide-react';

import { Toggle } from '@/components/ui/toggle';
import { useAmountsHidden } from '@/providers';

export function HideAmountsToggle() {
  const { hidden, toggleHidden } = useAmountsHidden();

  return (
    <Toggle
      pressed={hidden}
      onPressedChange={toggleHidden}
      className="h-auto gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-caption font-normal data-[state=on]:bg-foreground data-[state=on]:text-background"
    >
      {hidden ? (
        <EyeOff aria-hidden="true" className="size-4" />
      ) : (
        <Eye aria-hidden="true" className="size-4" />
      )}
      Hide amounts
    </Toggle>
  );
}
