import { useRef, useState, type DragEvent } from 'react';

import type { ImportResult, StatementError } from '@/api';
import { PageHeading } from '@/components/PageHeading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useImportStatementMutation } from '@/hooks';

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
  const importMutation = useImportStatementMutation();
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

  function removeStatement(key: number) {
    setStatements((current) =>
      current.filter((statement) => statement.key !== key),
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
        const result = await importMutation.mutateAsync(statement.file);
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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeading
        title="Import statements"
        description="Each statement goes into the account for its bank, which is created on its first import."
      />

      <StatementDropZone onFiles={addFiles} />
      {statements.length > 0 && (
        <>
          <ul className="mt-6 space-y-3">
            {statements.map((statement) => (
              <li key={statement.key} aria-label={statement.file.name}>
                <Card size="sm">
                  <CardContent className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-medium break-all">
                        {statement.file.name}
                      </span>
                      <StatementStatusMessage status={statement.status} />
                    </div>
                    {!isImporting && pending.includes(statement) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${statement.file.name}`}
                        onClick={() => removeStatement(statement.key)}
                      >
                        Remove
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {(isImporting || pending.length > 0) && (
            <Button
              size="lg"
              className="mt-6 px-4"
              disabled={isImporting}
              onClick={() => void importPendingStatements()}
            >
              {isImporting ? 'Importing…' : importLabel(pending.length)}
            </Button>
          )}
        </>
      )}
    </main>
  );
}

function importLabel(count: number) {
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
      className={`mt-8 flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${isDragging ? 'border-foreground bg-accent' : 'border-input bg-card hover:bg-accent'}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <span className="pointer-events-none font-medium">
        Drop statement CSVs here
      </span>
      <span className="pointer-events-none mt-1 text-sm text-muted-foreground">
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
      return (
        <p className="mt-2 text-sm text-muted-foreground">Ready to import</p>
      );
    case 'importing':
      return <p className="mt-2 text-sm text-muted-foreground">Importing…</p>;
    case 'imported':
      return <ImportOutcome result={status.result} />;
    case 'failed':
      return (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {status.message}. Import again to retry.
        </p>
      );
  }
}

function ImportOutcome({ result }: { result: ImportResult }) {
  switch (result.kind) {
    case 'completed':
      return (
        <p role="status" className="mt-2 text-sm text-positive">
          Imported into {result.imported.account_name}:{' '}
          {result.imported.new_transaction_count} new transactions,{' '}
          {result.imported.existing_transaction_count} already imported.
        </p>
      );
    case 'rejected':
      return (
        <p role="alert" className="mt-2 text-sm text-warning">
          {result.message}.
        </p>
      );
    case 'invalid':
      return <StatementErrors errors={result.errors} />;
  }
}

function StatementErrors({ errors }: { errors: StatementError[] }) {
  return (
    <div role="alert" className="mt-2 text-sm text-destructive">
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
