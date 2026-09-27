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
- Manual transactions receive an immutable generated source key.

## Merchant classification

```text
transaction -> merchant key -> merchant -> category
```

Regex rules in code derive merchant keys from raw descriptions. Many merchant keys may resolve to one merchant. Each merchant belongs to one category.

An unresolved merchant key may have one current LLM suggestion. Approving or correcting it assigns the key to a merchant and removes the pending suggestion. Categorization uses an ordinary structured LLM call; it does not require LangGraph.

## Schema

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
