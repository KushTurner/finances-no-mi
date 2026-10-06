import type { ImportResult } from '@/api';

export type StatementStatus =
  | { kind: 'waiting' }
  | { kind: 'importing' }
  | { kind: 'imported'; result: ImportResult }
  | { kind: 'failed'; message: string };

export type QueuedStatement = {
  key: number;
  file: File;
  status: StatementStatus;
};
