import { useQuery } from '@tanstack/react-query';

import { listAccounts } from './api';
import { StatementImporter } from './StatementImporter';

export function ImportPage() {
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Finances No MI
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Import statements
      </h1>

      {accounts.isPending && (
        <p className="mt-8 text-slate-600">Loading accounts…</p>
      )}
      {accounts.isError && (
        <p role="alert" className="mt-8 text-red-700">
          Accounts could not be loaded. Check that the API is running.
        </p>
      )}
      {accounts.isSuccess && accounts.data.length === 0 && (
        <p className="mt-8 text-slate-600">
          No accounts yet. Create one through the API before importing.
        </p>
      )}
      {accounts.isSuccess && accounts.data.length > 0 && (
        <StatementImporter accounts={accounts.data} />
      )}
    </main>
  );
}
