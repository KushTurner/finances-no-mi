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

Changing a normalization rule does not alter the stored raw description or the identity of an existing transaction. Reparsing or remapping existing records is a separate feature and is not implicit.

## Data changes

The initial schema already contains the required tables:

- `import_files` stores the account, original filename, content hash, bytes, and import time.
- `transactions` stores canonical financial events and their account-scoped source keys.
- `import_file_transactions` records the rows observed in each file.
- `merchant_keys` stores the normalized description used by merchant resolution.

Schema details and constraints remain defined in [Architecture](../architecture.md).

## API and UI behaviour

The initial API needs one import operation. Its response should distinguish:

- a successful import;
- an exact file that was already imported;
- an unsupported or malformed statement;
- row-specific validation failures.

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

## Open questions

- Confirm the exact required and optional columns for each supported export before implementing its adapter.
- Decide how the initial local accounts are created when planning the persistence slice.
