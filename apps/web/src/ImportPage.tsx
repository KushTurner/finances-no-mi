import { useRef, useState, type DragEvent } from 'react';

import { importStatement, type ImportResult, type StatementError } from './api';

type StatementStatus =
  | { kind: 'waiting' }
  | { kind: 'importing' }
  | { kind: 'imported'; result: ImportResult }
  | { kind: 'failed'; message: string };

type QueuedStatement = {
  key: number;
  file: File;
  status: StatementStatus;
};

export function ImportPage() {
  const [statements, setStatements] = useState<QueuedStatement[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const nextKey = useRef(0);
  const pending = statements.filter(
    (statement) =>
      statement.status.kind === 'waiting' || statement.status.kind === 'failed',
  );

  function updateStatus(key: number, status: StatementStatus) {
    setStatements((current) =>
      current.map((statement) =>
        statement.key === key ? { ...statement, status } : statement,
      ),
    );
  }

  function addFiles(files: File[]) {
    const added = files.map((file): QueuedStatement => ({
      key: nextKey.current++,
      file,
      status: { kind: 'waiting' },
    }));
    setStatements((current) => [...current, ...added]);
  }

  async function importPendingStatements() {
    setIsImporting(true);
    for (const statement of pending) {
      updateStatus(statement.key, { kind: 'importing' });
      try {
        const result = await importStatement(statement.file);
        updateStatus(statement.key, { kind: 'imported', result });
      } catch (error) {
        updateStatus(statement.key, {
          kind: 'failed',
          message: (error as Error).message,
        });
      }
    }
    setIsImporting(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Finances No MI
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Import statements
      </h1>
      <p className="mt-2 text-slate-600">
        Each statement goes into the account for its bank, which is created on
        its first import.
      </p>

      <StatementDropZone onFiles={addFiles} />
      {statements.length > 0 && (
        <>
          <ul className="mt-6 space-y-3">
            {statements.map((statement) => (
              <li
                key={statement.key}
                aria-label={statement.file.name}
                className="rounded-md border border-slate-200 bg-white p-4"
              >
                <span className="font-medium break-all text-slate-900">
                  {statement.file.name}
                </span>
                <StatementStatusMessage status={statement.status} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
            disabled={isImporting || pending.length === 0}
            onClick={() => void importPendingStatements()}
          >
            {isImporting ? 'Importing…' : importLabel(pending.length)}
          </button>
        </>
      )}
    </main>
  );
}

function importLabel(count: number) {
  if (count === 0) {
    return 'Import';
  }
  return `Import ${count} ${count === 1 ? 'statement' : 'statements'}`;
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

function StatementStatusMessage({ status }: { status: StatementStatus }) {
  switch (status.kind) {
    case 'waiting':
      return null;
    case 'importing':
      return <p className="mt-2 text-sm text-slate-600">Importing…</p>;
    case 'imported':
      return <ImportOutcome result={status.result} />;
    case 'failed':
      return (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {status.message}. Import again to retry.
        </p>
      );
  }
}

function ImportOutcome({ result }: { result: ImportResult }) {
  switch (result.kind) {
    case 'completed':
      return (
        <p role="status" className="mt-2 text-sm text-emerald-800">
          Imported into {result.accountName}: {result.newTransactionCount} new
          transactions, {result.existingTransactionCount} already imported.
        </p>
      );
    case 'rejected':
      return (
        <p role="alert" className="mt-2 text-sm text-amber-800">
          {result.message}.
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
