import { useRef, useState } from 'react';

import type { NewAccount } from '@/api';
import { PageHeading } from '@/components/common';
import { StatementCard, StatementDropZone } from '@/components/import';
import type { QueuedStatement, StatementStatus } from '@/components/import';
import { Button } from '@/components/ui/button';
import { useImportStatementMutation } from '@/hooks';
import { formatCount } from '@/lib';

function needsAccount(statement: QueuedStatement) {
  return (
    statement.status.kind === 'imported' &&
    statement.status.result.kind === 'needsAccount'
  );
}

export function ImportPage() {
  const [statements, setStatements] = useState<QueuedStatement[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const nextKey = useRef(0);
  const importMutation = useImportStatementMutation();
  const pending = statements.filter(
    (statement) =>
      statement.status.kind === 'waiting' || statement.status.kind === 'failed',
  );
  const needingAccount = statements.filter(needsAccount);
  const removable = [...pending, ...needingAccount];

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

  async function importStatement(
    statement: QueuedStatement,
    newAccount?: NewAccount,
  ) {
    updateStatus(statement.key, { kind: 'importing' });
    try {
      const result = await importMutation.mutateAsync({
        file: statement.file,
        newAccount,
      });
      updateStatus(statement.key, { kind: 'imported', result });
      return result;
    } catch (error) {
      updateStatus(statement.key, {
        kind: 'failed',
        message: (error as Error).message,
      });
      return undefined;
    }
  }

  async function importPendingStatements() {
    setIsImporting(true);
    for (const statement of pending) {
      await importStatement(statement);
    }
    setIsImporting(false);
  }

  async function addAccountAndImport(
    statement: QueuedStatement,
    newAccount: NewAccount,
  ) {
    const othersNeedingAccount = needingAccount.filter(
      (other) => other !== statement,
    );
    setIsImporting(true);
    const result = await importStatement(statement, newAccount);
    if (result?.kind === 'completed') {
      for (const other of othersNeedingAccount) {
        await importStatement(other);
      }
    }
    setIsImporting(false);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeading
        title="Import statements"
        description="Each statement goes into the account it belongs to. The first statement for a new account asks which account it is."
      />

      <StatementDropZone onFiles={addFiles} />
      {statements.length > 0 && (
        <>
          <ul className="mt-6 space-y-3">
            {statements.map((statement) => (
              <li key={statement.key} aria-label={statement.file.name}>
                <StatementCard
                  statement={statement}
                  removable={!isImporting && removable.includes(statement)}
                  disabled={isImporting}
                  onRemove={() => removeStatement(statement.key)}
                  onAddAccount={
                    statement === needingAccount[0]
                      ? (newAccount) =>
                          void addAccountAndImport(statement, newAccount)
                      : undefined
                  }
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
