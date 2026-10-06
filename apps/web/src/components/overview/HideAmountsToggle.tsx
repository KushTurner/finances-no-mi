import { Eye, EyeOff } from 'lucide-react';

import { useAmountsHidden } from '@/providers';

export function HideAmountsToggle() {
  const { hidden, toggleHidden } = useAmountsHidden();

  return (
    <button
      type="button"
      aria-pressed={hidden}
      onClick={toggleHidden}
      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] aria-pressed:bg-foreground aria-pressed:text-background"
    >
      {hidden ? (
        <EyeOff aria-hidden="true" className="size-4" />
      ) : (
        <Eye aria-hidden="true" className="size-4" />
      )}
      Hide amounts
    </button>
  );
}
