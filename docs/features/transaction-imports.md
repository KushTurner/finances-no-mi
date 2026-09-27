# Transaction Imports

## Outcome

Transactions from supported institutions can be imported into one canonical model without losing source evidence or creating duplicates when statement date ranges overlap.

## User flow

1. The user selects the account represented by the statement.
2. The user uploads a CSV export.
3. The backend selects the parser using the account institution rather than guessing from private file contents.
4. The complete file is validated and converted into canonical transaction candidates.
5. The import is persisted atomically.
6. The user receives counts for new transactions and transactions already observed in another import.

The first supported CSV sources are Amex, NatWest, and Nationwide. Chase savings activity uses the separate manual-entry flow.

## Business rules

### Source preservation

- Store the original CSV bytes in the local database so an import can be audited or reparsed after parser rules improve.
- Store a SHA-256 content hash and reject an exact re-upload of the same bytes.
- Preserve the original filename locally for display, but never log it or include it in fixtures, screenshots, or documentation.
- Preserve each transaction's exact source description separately from its derived merchant key.

### Transaction identity

File identity and transaction identity are separate:

- The content hash determines whether the same file has already been imported.
- The source key determines whether a transaction has already been observed in a different file.
- The import-to-transaction link records every file in which a transaction appeared.

Source keys are scoped to an account:

- Amex uses the stable reference supplied by the export.
- NatWest and Nationwide use an exact fingerprint of the date, source type, raw description, signed amount, and resulting balance.
- Manual transactions use an immutable generated key.

The resulting balance is part of the NatWest and Nationwide identity so two otherwise identical purchases on the same day remain separate events. The same event appearing in overlapping exports retains the same fingerprint and is reused.

When a source key repeats within one file, such as two identical purchases separated by a refund of the same amount that restores the balance, the second occurrence receives the suffix `#2`, the third `#3`, and so on. Exports cover whole days in a consistent order, so the same repeated events receive the same numbered keys in overlapping exports.

No fuzzy matching, date-window matching, or merchant-based deduplication is permitted. Merchant normalization must not affect transaction identity.

### Canonical values

- Store GBP values as integer pence.
- Income and refunds are positive.
- Spending and withdrawals are negative.
- Store source dates as dates without inventing a time.
- Optional source fields remain absent rather than being replaced with guessed values.

### Validation and persistence

- A parser accepts bytes and produces canonical transaction candidates or row-specific validation failures.
- Institution-specific column names, date formats, and sign conventions stay inside their parser adapter.
- Validate the whole file before writing it.
- If any row is invalid, persist neither the import file nor its transactions.
- Perform the accepted import in one database transaction.

## Supported export formats

Each adapter locates the first row containing its required columns, ignores any other columns, and never reads account-holder or account-number columns.

| Source | Required columns | Date | Amount | Source key |
| --- | --- | --- | --- | --- |
| Amex | `Date`, `Description`, `Amount`, `Reference` | `DD/MM/YYYY` | `Amount`, charges positive, so negated | `ref:` + reference without its surrounding apostrophes |
| NatWest | `Date`, `Type`, `Description`, `Value`, `Balance` | `DD Mon YYYY` | `Value`, already signed | `fp:` fingerprint |
| Nationwide | `Date`, `Transaction type`, `Description`, `Paid out`, `Paid in`, `Balance` | `DD Mon YYYY` | `Paid in` minus `Paid out`; exactly one is present | `fp:` fingerprint |

Nationwide exports start with a UTF-8 byte order mark and an account summary above the header. Amex address cells can span several lines, so row numbers count CSV records rather than physical lines.

Amounts accept an optional `-` and `£` followed by at most two decimal places. Any other format is a row error.

The fingerprint is the SHA-256 of the compact JSON array `[ISO date, source type, raw description, amount in pence, balance in pence]`. Its encoding is fixed; changing it would change the identity of every stored transaction.

## Description normalization

Merchant-key normalization is deterministic and happens after parsing:

1. Preserve the raw description unchanged.
2. Apply ordered, institution-specific regex substitutions defined in code.
3. Normalize whitespace and casing according to one shared rule.
4. Use the result as the merchant key.

Every regex rule needs focused synthetic examples proving what it removes and what it preserves. Rules should target known institution formatting rather than attempt broad natural-language cleanup.

For example, a source description may resolve as:

```text
raw description -> DELIVEROO LTD -> Deliveroo -> Eating Out
                   merchant key     merchant     category
```

Until institution-specific rules exist, only the shared whitespace and casing rule applies: runs of whitespace collapse to one space, the result is trimmed, and it is uppercased.

Changing a normalization rule does not alter the stored raw description or the identity of an existing transaction. Reparsing or remapping existing records is a separate feature and is not implicit.

## Data changes

The initial schema already contains the required tables:

- `import_files` stores the account, original filename, content hash, bytes, and import time.
- `transactions` stores canonical financial events and their account-scoped source keys.
- `import_file_transactions` records the rows observed in each file.
- `merchant_keys` stores the normalized description used by merchant resolution.

Schema details and constraints remain defined in [Architecture](../architecture.md).

## API and UI behaviour

Local accounts are created and listed through `POST /accounts` and `GET /accounts`. An account's institution is one of `amex`, `natwest`, `nationwide`, or `chase`, and its type is one of `current_account`, `credit_card`, or `savings`.

`POST /accounts/{account_id}/imports` accepts the CSV as a multipart `file` field. Its response distinguishes:

- a successful import: `201` with the import id and counts of new and existing transactions;
- an exact file that was already imported: `409`;
- an unsupported or malformed statement, or row-specific validation failures: `422` with `errors`, each containing a `row_number` (`null` for file-level errors) and a `message`;
- an unknown account: `404`.

The initial UI needs account selection, a file input, a submit action, and a result summary. It does not need a pre-import spreadsheet editor or a generic column-mapping interface.

## Acceptance criteria

- Each supported source parses a representative synthetic CSV into the canonical model.
- Amount signs and pence conversion are tested for spending, income, and refunds where the source supports them.
- Uploading identical file bytes twice does not create another import.
- Importing overlapping exports creates one transaction per financial event and records both observations.
- Two same-day transactions with matching descriptions and amounts remain separate when their source identity differs.
- A malformed row produces a useful row number and leaves the database unchanged.
- Tests and screenshots contain only synthetic data.

## Out of scope

- Automatic institution detection from arbitrary files.
- User-defined column mapping.
- Background jobs or import queues.
- Editing source rows during import.
- Fuzzy duplicate detection.
- Reprocessing historical imports after parser or regex changes.
