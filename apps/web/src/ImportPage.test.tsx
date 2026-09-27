import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { ImportPage } from './ImportPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubImports(responsesByFilename: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init?: RequestInit) => {
      const file = (init?.body as FormData).get('file') as File;
      return Promise.resolve(responsesByFilename[file.name]());
    }),
  );
}

function completedImport(accountName: string) {
  return () =>
    Response.json(
      {
        import_id: 1,
        account_name: accountName,
        new_transaction_count: 12,
        existing_transaction_count: 3,
      },
      { status: 201 },
    );
}

function dropStatements(...names: string[]) {
  const files = names.map((name) => new File(['Date\n'], name));
  fireEvent.drop(screen.getByLabelText(/Drop statement CSVs/), {
    dataTransfer: { files },
  });
}

function statementRow(name: string) {
  return within(screen.getByRole('listitem', { name }));
}

test('imports each dropped statement into the account for its bank', async () => {
  stubImports({
    'natwest.csv': completedImport('NatWest'),
    'amex.csv': completedImport('Amex'),
  });
  render(<ImportPage />);
  dropStatements('natwest.csv', 'amex.csv');

  fireEvent.click(screen.getByRole('button', { name: 'Import 2 statements' }));

  expect(
    await statementRow('natwest.csv').findByRole('status'),
  ).toHaveTextContent(
    'Imported into NatWest: 12 new transactions, 3 already imported.',
  );
  expect(await statementRow('amex.csv').findByRole('status')).toHaveTextContent(
    'Imported into Amex: 12 new transactions, 3 already imported.',
  );
});

test('removes a statement added by mistake before importing', () => {
  render(<ImportPage />);
  dropStatements('natwest.csv', 'notes.csv');

  fireEvent.click(screen.getByRole('button', { name: 'Remove notes.csv' }));

  expect(screen.queryByRole('listitem', { name: 'notes.csv' })).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Import 1 statement' }),
  ).toBeVisible();
});

test('shows why a statement was rejected', async () => {
  stubImports({
    'natwest.csv': () =>
      Response.json(
        { detail: 'This file has already been imported' },
        { status: 409 },
      ),
  });
  render(<ImportPage />);
  dropStatements('natwest.csv');

  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));

  expect(
    await statementRow('natwest.csv').findByRole('alert'),
  ).toHaveTextContent('This file has already been imported.');
});

test('lists validation errors with their row numbers', async () => {
  stubImports({
    'natwest.csv': () =>
      Response.json(
        {
          errors: [
            { row_number: null, message: 'Missing Balance column' },
            { row_number: 4, message: 'Invalid amount' },
          ],
        },
        { status: 400 },
      ),
  });
  render(<ImportPage />);
  dropStatements('natwest.csv');

  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));

  const errors = await statementRow('natwest.csv').findAllByRole('listitem');
  expect(errors.map((error) => error.textContent)).toEqual([
    'Missing Balance column',
    'Row 4: Invalid amount',
  ]);
});

test('retries a statement whose import failed', async () => {
  const responses = [
    () => new Response(null, { status: 500 }),
    completedImport('NatWest'),
  ];
  stubImports({ 'natwest.csv': () => responses.shift()!() });
  render(<ImportPage />);
  dropStatements('natwest.csv');
  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));
  expect(
    await statementRow('natwest.csv').findByRole('alert'),
  ).toHaveTextContent(
    'The API responded with status 500. Import again to retry.',
  );

  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));

  expect(
    await statementRow('natwest.csv').findByRole('status'),
  ).toHaveTextContent('Imported into NatWest');
});
