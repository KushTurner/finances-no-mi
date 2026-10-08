# Transaction Imports

This document describes the implemented CSV importer. The agreed [OFX replacement plan](ofx-imports.md) defines the next import slice.

## Outcome

Transactions from supported institutions can be imported into one canonical model without losing source evidence or creating duplicates when statement date ranges overlap.

## User flow

1. The user drops or chooses one or more CSV exports.
2. The backend detects each file's institution from its header row.
3. The file is imported into that institution's account. The first import for an institution creates its account.
4. Each file is imported separately, using the institution's parser.
5. The complete file is validated and converted into canonical transaction candidates.
6. The import is persisted atomically.
7. The user receives, per file, counts for new transactions and transactions already observed in another import, or the reason the file was not imported.

The first supported CSV sources are Amex, NatWest, and Nationwide.

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

Institution detection matches a file against each adapter's required columns. It succeeds only when exactly one supported format matches; otherwise the file is reported as unsupported. Detection reads column names only, never account-holder or account-number values.

Each institution has one account, and imports are the only way accounts are created. When an import finds no account for its institution, it creates one named after the institution: Amex as a credit card, and NatWest and Nationwide as current accounts. The account is created in the same database transaction as the import, so a rejected first statement creates no account.

| Source | Required columns | Date | Amount | Source key |
| --- | --- | --- | --- | --- |
| Amex | `Date`, `Description`, `Amount`, `Reference` | `DD/MM/YYYY` | `Amount`, charges positive, so negated | `ref:` + reference without its surrounding apostrophes |
| NatWest | `Date`, `Type`, `Description`, `Value`, `Balance` | `DD Mon YYYY` | `Value`, already signed | `fp:` fingerprint |
| Nationwide | `Date`, `Transaction type`, `Description`, `Paid out`, `Paid in`, `Balance` | `DD Mon YYYY` | `Paid in` minus `Paid out`; exactly one is present | `fp:` fingerprint |

Nationwide exports start with a UTF-8 byte order mark and an account summary above the header. Amex address cells can span several lines, so row numbers count CSV records rather than physical lines.

Amounts accept an optional `-` and `£` followed by at most two decimal places. Any other format is a row error.

The fingerprint is the SHA-256 of the compact JSON array `[ISO date, source type, raw description, amount in pence, balance in pence]`. Its encoding is fixed; changing it would change the identity of every stored transaction.

## Description normalization

The current importer preserves the raw description unchanged and derives a merchant key after parsing using one shared rule: runs of whitespace collapse to one space, the result is trimmed, and it is uppercased.

This key is not a category assignment or a reliable identifier for a person. [Transaction categorization](transaction-categorization.md) operates on individual transactions and preserves meaningful description context. Institution-specific regex cleanup is not required for that workflow.

If description cleanup is introduced later, every rule needs focused synthetic examples proving what it removes and what it preserves. Changing a rule must not alter source descriptions, transaction identity, or existing records implicitly. Reparsing or remapping existing records remains a separate feature.

## Data changes

The initial schema already contains the required tables:

- `import_files` stores the account, original filename, content hash, bytes, and import time.
- `transactions` stores canonical financial events and their account-scoped source keys.
- `import_file_transactions` records the rows observed in each file.
- `merchant_keys` stores the normalized description used by the existing import model; category decisions will be stored separately on transactions.

Schema details and constraints remain defined in [Architecture](../architecture.md).

## API and UI behaviour

Accounts are listed through `GET /accounts`. An account's institution is one of `amex`, `natwest`, or `nationwide`, and its type is one of `current_account`, `credit_card`, or `savings`.

`POST /imports` accepts the CSV as a multipart `file` field, detects its institution, and imports it into that institution's account. Its response distinguishes:

- a successful import: `201` with the import id, account name, and counts of new and existing transactions;
- an exact file that was already imported: `409` with a `detail` message;
- an unreadable file, an unsupported header, a malformed statement, or row-specific validation failures: `400` with `errors`, each containing a `row_number` (`null` for file-level errors) and a `message`.

The UI accepts several files by drag and drop or a file picker, imports them one at a time through `POST /imports`, and shows each file's account and outcome. It does not need a pre-import spreadsheet editor or a generic column-mapping interface.

## Acceptance criteria

- Each supported source parses a representative synthetic CSV into the canonical model.
- Amount signs and pence conversion are tested for spending, income, and refunds where the source supports them.
- Uploading identical file bytes twice does not create another import.
- Importing overlapping exports creates one transaction per financial event and records both observations.
- Two same-day transactions with matching descriptions and amounts remain separate when their source identity differs.
- A malformed row produces a useful row number and leaves the database unchanged.
- Tests and screenshots contain only synthetic data.

## Out of scope

- Detecting institutions from anything other than the exact header columns of supported formats.
- Matching files to accounts by account number or account-holder details.
- User-defined column mapping.
- Background jobs or import queues.
- Editing source rows during import.
- Fuzzy duplicate detection.
- Reprocessing historical imports after parser or regex changes.
