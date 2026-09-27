# Architecture

## Scope

Finances No MI is a local-only, single-user application. The backend uses SQLite, and no authentication or deployment infrastructure is included.

The application stores GBP amounts as integer pence. Income and refunds are positive; spending and withdrawals are negative.

## Import model

Original CSV bytes are stored in SQLite with a SHA-256 content hash. Uploading the exact same file twice is rejected. Different exports with overlapping dates are accepted.

One canonical transaction may be observed in multiple imports. `import_file_transactions` records each observation without duplicating the financial event.

Transaction identity is independent from merchant normalization:

- Amex transactions use the source reference.
- NatWest and Nationwide transactions use an exact fingerprint containing the date, source type, raw description, amount, and resulting balance.
- A source key repeated within one file is numbered by occurrence.

## Transaction classification

```text
transaction -> assigned category
transaction -> suggestion -> human review
```

Categories belong to transactions. The same description, merchant, or person can occur in transactions with different purposes. Neither exact description matching nor identifying a sender automatically assigns a category.

The next slice adds manual categorization from the fixed list in [Transaction categorization](features/transaction-categorization.md). A later slice adds structured LLM suggestions with human review. Suggestions remain separate from assigned categories, and review preserves the prediction and human decision for evaluation. Categorization does not require LangGraph or merchant resolution.

The importer currently creates merchant keys using whitespace/casing normalization. Existing merchant tables can remain during this transition, but their category relationships are not authoritative for transaction categorization.

## Current schema

This section describes the implemented schema. Planned additions are listed separately below; they must be introduced through Alembic migrations.

### accounts

- `id`: integer primary key
- `name`: unique display name
- `institution`: source institution
- `account_type`: current account, credit card, or savings

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
- `balance_after_minor`: optional balance after the transaction
- `source_type`: optional bank transaction type
- `raw_description`: exact source description
- `source_reference`: optional source-provided reference
- `source_key`: immutable source identity
- `merchant_key_id`: derived merchant key foreign key
- `created_at`: creation timestamp
- Unique constraint on `account_id` and `source_key`

### import_file_transactions

- `import_file_id`: import foreign key
- `transaction_id`: transaction foreign key
- `row_number`: source row number
- Primary key on `import_file_id` and `row_number`
- Unique constraint on `import_file_id` and `transaction_id`

### categories

- `id`: integer primary key
- `name`: unique category name

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

No PII, real financial data, statements, credentials, or API keys may be committed. Tests and examples use synthetic data only. Local CSV files, databases, uploaded data, and environment files are ignored by Git.

External categorization requests follow the [LLM boundary](features/transaction-categorization.md#llm-boundary). Original descriptions remain local and unchanged. Do not log statement contents, descriptions, account identifiers, or LLM payloads containing transaction data.

## Planned schema changes

### Manual categorization slice

- Add a definition to each category and seed the agreed ten categories.
- Add nullable `transactions.category_id`; absence means uncategorized.
- Record the source and time of the current category decision so human decisions remain distinguishable from later automated assignments. Clearing a category must clear the current assignment consistently.
- Keep category changes independent from immutable source fields, source keys, and import observations.
- Do not automatically derive transaction categories from existing merchant mappings.

### Suggestion and review slice

- Add transaction-level suggestion storage rather than using `merchant_suggestions`.
- Record the transaction, proposed category or explicit abstention, optional confidence, provider/model, prompt version, category-definition version, and creation time.
- Allow at most one pending suggestion per transaction. Repeated requests must not duplicate pending suggestions or overwrite reviewed evidence.
- Record the human review outcome, final chosen category, and review time alongside the original prediction. Later category corrections must not rewrite what the user decided in that earlier review.
- Assign the category and record the review outcome in one database transaction, including for an explicitly selected batch.
- Retain reviewed prediction/decision records rather than deleting them. Raw LLM responses and full prompt archives are not required.

Exact fields and constraints will be finalized within each implementation slice. No migration or application change is included in this planning update.
