import type { StatementError } from '@/api';

type StatementErrorsProps = {
  errors: StatementError[];
};

export function StatementErrors({ errors }: StatementErrorsProps) {
  return (
    <div role="alert" className="mt-2 text-sm text-destructive">
      <p>The statement was not imported:</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {errors.map((error, index) => (
          <li key={index}>
            {error.position === null
              ? error.message
              : `Transaction ${error.position}: ${error.message}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
