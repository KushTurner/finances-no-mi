# Architecture

## Scope

Finances No MI is a local-only, single-user application. The backend uses SQLite, and no authentication or deployment infrastructure is included.

The application stores GBP amounts as integer pence. Income and refunds are positive; spending and withdrawals are negative.

## Import model

Original OFX bytes are stored in SQLite with a SHA-256 content hash. Uploading the exact same file twice is rejected. Different exports with overlapping dates are accepted.

One canonical transaction may be observed in multiple imports. `import_file_transactions` records each observation without duplicating the financial event.

A statement is matched to its account by the account's OFX identifiers, and a transaction is identified by its `FITID` within that account. Transaction identity is independent from merchant normalization. See [OFX imports](features/ofx-imports.md).

## Transaction classification

Categorization is paused; see [Transaction categorization](features/transaction-categorization.md). Transactions currently have no classification, and every transaction counts toward the overview totals.

The importer creates merchant keys using whitespace/casing normalization.

## Current schema

This section describes the implemented schema. Changes must be introduced through Alembic migrations.

### accounts

- `id`: integer primary key
- `name`: display name, not necessarily unique
- `institution`: source institution
- `account_type`: current account, credit card, or savings
- `preset`: account preset id
- `acctid`: OFX account identifier as supplied, indexed for matching
- `bankid`, `org`, `fid`: optional OFX bank and institution identifiers as supplied

### import_files

- `id`: integer primary key
- `account_id`: account foreign key
- `original_filename`: uploaded filename
- `content_sha256`: globally unique content hash
- `content`: immutable original bytes
- `imported_at`: import timestamp

### transactions

- `id`: integer primary key
- `account_id`: account foreign key
- `transaction_date`: source transaction date
- `amount_minor`: signed amount in pence
- `source_type`: optional bank transaction type
- `raw_description`: exact OFX `NAME`
- `memo`: optional exact OFX `MEMO`, kept out of the description
- `fitid`: OFX transaction identifier
- `merchant_key_id`: derived merchant key foreign key
- `created_at`: creation timestamp
- Unique constraint on `account_id` and `fitid`

### import_file_transactions

- `import_file_id`: import foreign key
- `transaction_id`: transaction foreign key
- `position`: the transaction's position in the statement, from 1
- Primary key on `import_file_id` and `position`
- Unique constraint on `import_file_id` and `transaction_id`

### merchant_keys

- `id`: integer primary key
- `value`: unique normalized source value

## Data handling

No PII, real financial data, statements, credentials, or API keys may be committed. Tests and examples use synthetic data only. Local statement files, databases, uploaded data, and environment files are ignored by Git.

Original descriptions remain local and unchanged. Do not log statement contents, descriptions, account identifiers, or LLM payloads containing transaction data.
