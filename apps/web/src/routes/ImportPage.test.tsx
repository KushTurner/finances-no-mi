import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { ImportPage } from './ImportPage';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const presets = [
  {
    id: 'amex_gold',
    name: 'American Express Gold',
    institution: 'amex',
    account_type: 'credit_card',
  },
  {
    id: 'nationwide_flexone',
    name: 'Nationwide FlexOne',
    institution: 'nationwide',
    account_type: 'current_account',
  },
  {
    id: 'natwest_select',
    name: 'NatWest Select',
    institution: 'natwest',
    account_type: 'current_account',
  },
];

type ImportResponder = (form: FormData) => Response;

function stubApi(respondersByFilename: Record<string, ImportResponder>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/account-presets') {
      return Promise.resolve(Response.json(presets));
    }
    const form = init?.body as FormData;
    const file = form.get('file') as File;
    return Promise.resolve(respondersByFilename[file.name](form));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function completedImport(accountName: string): ImportResponder {
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

const needsAccount: ImportResponder = () =>
  Response.json(
    { detail: 'Add an account for this statement' },
    { status: 422 },
  );

function needsAccountUntilPresetChosen(accountName: string): ImportResponder {
  return (form) =>
    form.has('preset')
      ? completedImport(accountName)(form)
      : needsAccount(form);
}

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ImportPage />
    </QueryClientProvider>,
  );
}

function dropStatements(...names: string[]) {
  const files = names.map((name) => new File(['<OFX>'], name));
  fireEvent.drop(screen.getByLabelText(/Drop OFX statements/), {
    dataTransfer: { files },
  });
}

function statementRow(name: string) {
  return within(screen.getByRole('listitem', { name }));
}

test('imports each dropped statement into its matching account', async () => {
  stubApi({
    'natwest.ofx': completedImport('NatWest Select'),
    'amex.ofx': completedImport('American Express Gold'),
  });
  renderPage();
  dropStatements('natwest.ofx', 'amex.ofx');

  fireEvent.click(screen.getByRole('button', { name: 'Import 2 statements' }));

  expect(
    await statementRow('natwest.ofx').findByRole('status'),
  ).toHaveTextContent(
    'Imported into NatWest Select: 12 new transactions, 3 already imported.',
  );
  expect(await statementRow('amex.ofx').findByRole('status')).toHaveTextContent(
    'Imported into American Express Gold: 12 new transactions, 3 already imported.',
  );
});

test('offers every preset without choosing one', async () => {
  stubApi({ 'natwest.ofx': needsAccount });
  renderPage();
  dropStatements('natwest.ofx');

  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));

  const radios = await statementRow('natwest.ofx').findAllByRole('radio');
  expect(
    radios.map((radio) => (radio as HTMLButtonElement).labels[0].textContent),
  ).toEqual(['American Express Gold', 'Nationwide FlexOne', 'NatWest Select']);
  expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual([
    'false',
    'false',
    'false',
  ]);
});

test('adds the chosen account with its nickname and imports the statement', async () => {
  const fetchMock = stubApi({
    'natwest.ofx': needsAccountUntilPresetChosen('Bills'),
  });
  renderPage();
  dropStatements('natwest.ofx');
  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));
  fireEvent.click(
    await statementRow('natwest.ofx').findByRole('radio', {
      name: 'NatWest Select',
    }),
  );
  fireEvent.change(
    statementRow('natwest.ofx').getByLabelText('Name (optional)'),
    {
      target: { value: 'Bills' },
    },
  );

  fireEvent.click(
    statementRow('natwest.ofx').getByRole('button', {
      name: 'Add account and import',
    }),
  );

  expect(
    await statementRow('natwest.ofx').findByRole('status'),
  ).toHaveTextContent('Imported into Bills');
  const form = fetchMock.mock.lastCall?.[1]?.body as FormData;
  expect([form.get('preset'), form.get('name')]).toEqual([
    'natwest_select',
    'Bills',
  ]);
});

test('imports other statements for the new account once it is added', async () => {
  let accountAdded = false;
  stubApi({
    'september.ofx': (form) => {
      accountAdded = form.has('preset');
      return needsAccountUntilPresetChosen('NatWest Select')(form);
    },
    'october.ofx': (form) =>
      accountAdded
        ? completedImport('NatWest Select')(form)
        : needsAccount(form),
  });
  renderPage();
  dropStatements('september.ofx', 'october.ofx');
  fireEvent.click(screen.getByRole('button', { name: 'Import 2 statements' }));
  fireEvent.click(
    await statementRow('september.ofx').findByRole('radio', {
      name: 'NatWest Select',
    }),
  );

  fireEvent.click(
    statementRow('september.ofx').getByRole('button', {
      name: 'Add account and import',
    }),
  );

  expect(
    await statementRow('october.ofx').findByRole('status'),
  ).toHaveTextContent('Imported into NatWest Select');
});

test('removes a statement added by mistake before importing', () => {
  renderPage();
  dropStatements('natwest.ofx', 'notes.ofx');

  fireEvent.click(screen.getByRole('button', { name: 'Remove notes.ofx' }));

  expect(screen.queryByRole('listitem', { name: 'notes.ofx' })).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Import 1 statement' }),
  ).toBeVisible();
});

test('shows why a statement was rejected', async () => {
  stubApi({
    'natwest.ofx': () =>
      Response.json(
        { detail: 'This file has already been imported' },
        { status: 409 },
      ),
  });
  renderPage();
  dropStatements('natwest.ofx');

  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));

  expect(
    await statementRow('natwest.ofx').findByRole('alert'),
  ).toHaveTextContent('This file has already been imported.');
});

test('lists validation errors with their transaction positions', async () => {
  stubApi({
    'natwest.ofx': () =>
      Response.json(
        {
          errors: [
            { position: null, message: 'File contains no transactions' },
            { position: 4, message: 'FITID is required' },
          ],
        },
        { status: 400 },
      ),
  });
  renderPage();
  dropStatements('natwest.ofx');

  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));

  const errors = await statementRow('natwest.ofx').findAllByRole('listitem');
  expect(errors.map((error) => error.textContent)).toEqual([
    'File contains no transactions',
    'Transaction 4: FITID is required',
  ]);
});

test('retries a statement whose import failed', async () => {
  const responses: ImportResponder[] = [
    () => new Response(null, { status: 500 }),
    completedImport('NatWest Select'),
  ];
  stubApi({ 'natwest.ofx': (form) => responses.shift()!(form) });
  renderPage();
  dropStatements('natwest.ofx');
  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));
  expect(
    await statementRow('natwest.ofx').findByRole('alert'),
  ).toHaveTextContent(
    'The API responded with status 500. Import again to retry.',
  );

  fireEvent.click(screen.getByRole('button', { name: 'Import 1 statement' }));

  expect(
    await statementRow('natwest.ofx').findByRole('status'),
  ).toHaveTextContent('Imported into NatWest Select');
});
