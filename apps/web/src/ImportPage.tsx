import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import {
  importStatement,
  listAccounts,
  type ImportResult,
  type StatementError,
} from './api';

type ImportRequest = {
  accountId: number;
  file: File;
};

export function ImportPage() {
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const statementImport = useMutation({
    mutationFn: ({ accountId, file }: ImportRequest) =>
      importStatement(accountId, file),
  });
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accountId === '' || file === null) {
      return;
    }
    statementImport.mutate({ accountId: Number(accountId), file });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Finances No MI
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Import a statement
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
        <form
          aria-label="Import statement"
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Account</span>
            <select
              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              value={accountId}
              required
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="" disabled>
                Select an account
              </option>
              {accounts.data.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Statement CSV
            </span>
            <input
              className="mt-2 block w-full text-sm text-slate-700"
              type="file"
              accept=".csv,text/csv"
              required
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
            disabled={statementImport.isPending}
          >
            {statementImport.isPending ? 'Importing…' : 'Import'}
          </button>
        </form>
      )}

      {statementImport.isSuccess && (
        <ImportOutcome result={statementImport.data} />
      )}
      {statementImport.isError && (
        <p role="alert" className="mt-8 text-red-700">
          The import could not be completed. Check that the API is running.
        </p>
      )}
    </main>
  );
}

function ImportOutcome({ result }: { result: ImportResult }) {
  switch (result.kind) {
    case 'completed':
      return (
        <section role="status" className="mt-8 rounded-md bg-emerald-50 p-4">
          <h2 className="font-medium text-emerald-900">Import complete</h2>
          <p className="mt-1 text-emerald-800">
            {result.newTransactionCount} new transactions,{' '}
            {result.existingTransactionCount} already imported.
          </p>
        </section>
      );
    case 'duplicate':
      return (
        <p
          role="alert"
          className="mt-8 rounded-md bg-amber-50 p-4 text-amber-900"
        >
          This file has already been imported.
        </p>
      );
    case 'accountNotFound':
      return (
        <p role="alert" className="mt-8 rounded-md bg-red-50 p-4 text-red-800">
          The selected account no longer exists.
        </p>
      );
    case 'invalid':
      return <StatementErrors errors={result.errors} />;
  }
}

function StatementErrors({ errors }: { errors: StatementError[] }) {
  return (
    <section role="alert" className="mt-8 rounded-md bg-red-50 p-4">
      <h2 className="font-medium text-red-900">
        The statement was not imported
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-red-800">
        {errors.map((error, index) => (
          <li key={index}>
            {error.row_number === null
              ? error.message
              : `Row ${error.row_number}: ${error.message}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
