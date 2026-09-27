import { useRef, useState, type DragEvent } from 'react';

import {
  detectInstitution,
  importStatement,
  type Account,
  type ImportResult,
  type Institution,
  type StatementError,
} from './api';

type StatementStatus =
  | { kind: 'detecting' }
  | { kind: 'unrecognised' }
  | { kind: 'ready' }
  | { kind: 'importing' }
  | { kind: 'imported'; result: ImportResult }
  | { kind: 'failed' };

type QueuedStatement = {
  key: number;
  file: File;
  institution: Institution | null;
  accountId: string;
  status: StatementStatus;
};

const INSTITUTION_NAMES: Record<Institution, string> = {
  amex: 'Amex',
  natwest: 'NatWest',
  nationwide: 'Nationwide',
};

export function StatementImporter({ accounts }: { accounts: Account[] }) {
  const [statements, setStatements] = useState<QueuedStatement[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const nextKey = useRef(0);
  const importable = statements.filter(
    (statement) => statement.status.kind === 'ready' && statement.accountId,
  );

  function updateStatement(key: number, changes: Partial<QueuedStatement>) {
    setStatements((current) =>
      current.map((statement) =>
        statement.key === key ? { ...statement, ...changes } : statement,
      ),
    );
  }

  async function detect(statement: QueuedStatement) {
    try {
      const institution = await detectInstitution(statement.file);
      updateStatement(
        statement.key,
        institution === null
          ? { status: { kind: 'unrecognised' } }
          : {
              institution,
              accountId: soleAccountId(accounts, institution),
              status: { kind: 'ready' },
            },
      );
    } catch {
      updateStatement(statement.key, { status: { kind: 'failed' } });
    }
  }

  function addFiles(files: File[]) {
    const added = files.map((file): QueuedStatement => ({
      key: nextKey.current++,
      file,
      institution: null,
      accountId: '',
      status: { kind: 'detecting' },
    }));
    setStatements((current) => [...current, ...added]);
    added.forEach((statement) => void detect(statement));
  }

  async function importStatements() {
    setIsImporting(true);
    for (const statement of importable) {
      updateStatement(statement.key, { status: { kind: 'importing' } });
      try {
        const result = await importStatement(
          Number(statement.accountId),
          statement.file,
        );
        updateStatement(statement.key, {
          status: { kind: 'imported', result },
        });
      } catch {
        updateStatement(statement.key, { status: { kind: 'failed' } });
      }
    }
    setIsImporting(false);
  }

  return (
    <>
      <StatementDropZone onFiles={addFiles} />
      {statements.length > 0 && (
        <>
          <ul className="mt-6 space-y-3">
            {statements.map((statement) => (
              <StatementRow
                key={statement.key}
                statement={statement}
                accounts={accounts}
                isImporting={isImporting}
                onAccountChange={(accountId) =>
                  updateStatement(statement.key, { accountId })
                }
              />
            ))}
          </ul>
          <button
            type="button"
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
            disabled={isImporting || importable.length === 0}
            onClick={() => void importStatements()}
          >
            {isImporting ? 'Importing…' : importLabel(importable.length)}
          </button>
        </>
      )}
    </>
  );
}

function importLabel(count: number) {
  if (count === 0) {
    return 'Import';
  }
  return `Import ${count} ${count === 1 ? 'statement' : 'statements'}`;
}

function soleAccountId(accounts: Account[], institution: Institution) {
  const matching = accounts.filter(
    (account) => account.institution === institution,
  );
  return matching.length === 1 ? String(matching[0].id) : '';
}

function StatementDropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <label
      className={`mt-8 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center ${isDragging ? 'border-slate-900 bg-slate-100' : 'border-slate-300 bg-white'}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <span className="pointer-events-none font-medium text-slate-900">
        Drop statement CSVs here
      </span>
      <span className="pointer-events-none mt-1 text-sm text-slate-600">
        or click to choose files
      </span>
      <input
        className="sr-only"
        type="file"
        accept=".csv,text/csv"
        multiple
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </label>
  );
}

type StatementRowProps = {
  statement: QueuedStatement;
  accounts: Account[];
  isImporting: boolean;
  onAccountChange: (accountId: string) => void;
};

function StatementRow({
  statement,
  accounts,
  isImporting,
  onAccountChange,
}: StatementRowProps) {
  const { file, institution, status } = statement;
  const matchingAccounts = accounts.filter(
    (account) => account.institution === institution,
  );

  return (
    <li
      aria-label={file.name}
      className="rounded-md border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-medium break-all text-slate-900">
          {file.name}
        </span>
        {institution !== null && matchingAccounts.length > 0 && (
          <select
            aria-label={`Account for ${file.name}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
            value={statement.accountId}
            disabled={isImporting || status.kind !== 'ready'}
            onChange={(event) => onAccountChange(event.target.value)}
          >
            <option value="" disabled>
              Select an account
            </option>
            {matchingAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {institution !== null && matchingAccounts.length === 0 && (
        <p className="mt-2 text-sm text-amber-800">
          This is a {INSTITUTION_NAMES[institution]} statement, but there is no{' '}
          {INSTITUTION_NAMES[institution]} account yet.
        </p>
      )}
      <StatementStatusMessage status={status} />
    </li>
  );
}

function StatementStatusMessage({ status }: { status: StatementStatus }) {
  switch (status.kind) {
    case 'detecting':
      return <p className="mt-2 text-sm text-slate-600">Detecting bank…</p>;
    case 'unrecognised':
      return (
        <p role="alert" className="mt-2 text-sm text-red-800">
          Not a supported Amex, NatWest, or Nationwide statement.
        </p>
      );
    case 'ready':
      return null;
    case 'importing':
      return <p className="mt-2 text-sm text-slate-600">Importing…</p>;
    case 'imported':
      return <ImportOutcome result={status.result} />;
    case 'failed':
      return (
        <p role="alert" className="mt-2 text-sm text-red-800">
          The request failed. Check that the API is running.
        </p>
      );
  }
}

function ImportOutcome({ result }: { result: ImportResult }) {
  switch (result.kind) {
    case 'completed':
      return (
        <p role="status" className="mt-2 text-sm text-emerald-800">
          Imported: {result.newTransactionCount} new transactions,{' '}
          {result.existingTransactionCount} already imported.
        </p>
      );
    case 'duplicate':
      return (
        <p role="alert" className="mt-2 text-sm text-amber-800">
          This file has already been imported.
        </p>
      );
    case 'accountNotFound':
      return (
        <p role="alert" className="mt-2 text-sm text-red-800">
          The selected account no longer exists.
        </p>
      );
    case 'invalid':
      return <StatementErrors errors={result.errors} />;
  }
}

function StatementErrors({ errors }: { errors: StatementError[] }) {
  return (
    <div role="alert" className="mt-2 text-sm text-red-800">
      <p>The statement was not imported:</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {errors.map((error, index) => (
          <li key={index}>
            {error.row_number === null
              ? error.message
              : `Row ${error.row_number}: ${error.message}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
