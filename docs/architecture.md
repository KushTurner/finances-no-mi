# Architecture

## Scope

Finances No MI is a local-only, single-user application. The backend uses SQLite, and no authentication or deployment infrastructure is included.

The application stores GBP amounts as integer pence. Income and refunds are positive; spending and withdrawals are negative.

## Import model

Original OFX bytes are stored in SQLite with a SHA-256 content hash. Uploading the exact same file twice is rejected. Different exports with overlapping dates are accepted.

One canonical transaction may be observed in multiple imports. `import_file_transactions` records each observation without duplicating the financial event.

A statement is matched to its account by the account's OFX identifiers, and a transaction is identified by its `FITID` within that account. Transaction identity is independent from merchant normalization. See [OFX imports](features/ofx-imports.md).

## Transaction classification

```text
transaction -> assigned category
transaction -> suggestion -> human review
```

Categories belong to transactions. The same description, merchant, or person can occur in transactions with different purposes. Neither exact description matching nor identifying a sender automatically assigns a category.

Manual categorization uses the fixed list in [Transaction categorization](features/transaction-categorization.md). A later slice adds structured LLM suggestions with human review. Suggestions remain separate from assigned categories, and review preserves the prediction and human decision for evaluation. Categorization does not require LangGraph or merchant resolution.

The importer currently creates merchant keys using whitespace/casing normalization. Existing merchant tables can remain during this transition, but their category relationships are not authoritative for transaction categorization.

## Current schema

This section describes the implemented schema. Planned additions are listed separately below; they must be introduced through Alembic migrations.

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
- `category_id`: nullable category foreign key; null means uncategorized
- `category_decision_source`: `human` for a manual assignment, null when cleared
- `category_decided_at`: UTC timestamp of the current assignment, null when cleared
- Check constraint keeps the category and its decision metadata present or absent together
- Unique constraint on `account_id` and `fitid`

### import_file_transactions

- `import_file_id`: import foreign key
- `transaction_id`: transaction foreign key
- `position`: the transaction's position in the statement, from 1
- Primary key on `import_file_id` and `position`
- Unique constraint on `import_file_id` and `transaction_id`

### categories

- `id`: integer primary key
- `name`: unique category name
- `definition`: category purpose; the migration seeds the ten agreed categories and definitions

Legacy categories without definitions remain stored for existing merchant references but are excluded from transaction category choices.

### merchants

- `id`: integer primary key
- `name`: unique canonical merchant name
- `category_id`: category foreign key

### merchant_keys

- `id`: integer primary key
- `value`: unique normalized source value
- `merchant_id`: optional merchant foreign key

### merchant_suggestions

- `merchant_key_id`: primary key and merchant-key foreign key
- `suggested_merchant_name`: suggested canonical name
- `suggested_category_id`: suggested category foreign key
- `confidence`: value from zero to one
- `created_at`: suggestion timestamp

## Data handling

No PII, real financial data, statements, credentials, or API keys may be committed. Tests and examples use synthetic data only. Local statement files, databases, uploaded data, and environment files are ignored by Git.

External categorization requests follow the [LLM boundary](features/transaction-categorization.md#llm-boundary). Original descriptions remain local and unchanged. Do not log statement contents, descriptions, account identifiers, or LLM payloads containing transaction data.

## Planned schema changes

### Suggestion and review slice

- Add transaction-level suggestion storage rather than using `merchant_suggestions`.
- Record the transaction, proposed category or explicit abstention, optional confidence, provider/model, prompt version, category-definition version, and creation time.
- Allow at most one pending suggestion per transaction. Repeated requests must not duplicate pending suggestions or overwrite reviewed evidence.
- Record the human review outcome, final chosen category, and review time alongside the original prediction. Later category corrections must not rewrite what the user decided in that earlier review.
- Assign the category and record the review outcome in one database transaction, including for an explicitly selected batch.
- Retain reviewed prediction/decision records rather than deleting them. Raw LLM responses and full prompt archives are not required.

Suggestion fields and constraints will be finalized in that implementation slice.
