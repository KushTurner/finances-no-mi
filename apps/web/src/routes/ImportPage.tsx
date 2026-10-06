import { useRef, useState } from 'react';

import { PageHeading } from '@/components/common';
import { StatementCard, StatementDropZone } from '@/components/import';
import type { QueuedStatement, StatementStatus } from '@/components/import';
import { Button } from '@/components/ui/button';
import { useImportStatementMutation } from '@/hooks';
import { formatCount } from '@/lib';

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
                <StatementCard
                  statement={statement}
                  removable={!isImporting && pending.includes(statement)}
                  onRemove={() => removeStatement(statement.key)}
                />
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
              {isImporting
                ? 'Importing…'
                : `Import ${formatCount(pending.length, 'statement')}`}
            </Button>
          )}
        </>
      )}
    </main>
  );
}
