# OFX Imports

## Outcome

Statements from supported accounts are imported from OFX files into one canonical transaction model. Each statement goes into the saved account it belongs to, and overlapping statements do not duplicate transactions. OFX replaced the earlier CSV importer; CSV-imported data was removed by the migration that introduced OFX.

One shared parser and one shared account matcher handle every supported account. [ofxtools](https://github.com/csingley/ofxtools) reads OFX 1 SGML and OFX 2 XML. No account, bank, or card has its own parsing or matching rules.

## User flow

1. The user drops or chooses one or more OFX files.
2. The backend parses and validates each complete statement, including its account metadata.
3. A statement that matches one saved account imports directly into it.
4. An unmatched statement shows **Add account**. It states whether the statement is for a credit or debit card, lists the presets of that card type with none chosen, and takes an optional name that defaults to the chosen preset's name.
5. The backend saves the account with the statement's OFX identifiers and imports the statement in the same database transaction.
6. When several statements need an account, the form appears on one at a time; the others wait. After an account is added, the waiting statements are retried: those that match it import, and the next unmatched one shows the form.

Each file has its own outcome: imported with new and existing transaction counts, already imported, needs an account, or invalid. Pending account setup creates nothing.

## Account presets

| Preset id | Name | Institution | Account type |
| --- | --- | --- | --- |
| `amex_gold` | American Express Gold | `amex` | `credit_card` |
| `nationwide_member_card` | Nationwide Member Card | `nationwide` | `credit_card` |
| `nationwide_flexone` | Nationwide FlexOne | `nationwide` | `current_account` |
| `natwest_select` | NatWest Select | `natwest` | `current_account` |

A preset supplies the account's name, institution, account type, and card type: `credit_card` presets are credit cards and every other account type is a debit card. The user always chooses the preset; the statement only narrows the choice to its card type. Account cards stay plain; any later card themes belong to the frontend, keyed by preset id. Adding a preset extends the catalogue; it does not add a parser or matching rule. Two accounts from the same preset are separate records matched by their OFX identifiers, and account names need not be unique.

## Account identity

The parser reads the statement's `ACCTID`, `BANKID`, `ORG`, and `FID`. Identifiers are stored as supplied, including leading zeroes and masking characters.

The card type comes from the standard OFX statement structure, the same for every institution: a credit card statement (`CCSTMTRS`) is `credit`, and a bank statement (`STMTRS`) is `debit`. `ACCTTYPE` is not read. A preset of the other card type is rejected and no account is created.

A saved account matches a statement when `ACCTID` is equal and every other identifier present on both sides is equal. Missing identifiers and placeholders consisting only of zeroes are ignored. A statement matching more than one saved account is rejected rather than imported; resolving accounts that export indistinguishable identifiers is out of scope.

## Transactions

- `FITID` identifies a transaction within its account: `UNIQUE (account_id, fitid)`. Overlapping statements reuse the transaction; the same `FITID` in another account is a separate transaction, and distinct `FITID`s stay separate even when every other value matches.
- Amounts are signed integer pence as supplied by `TRNAMT`: spending negative, income and refunds positive. More than two decimal places is invalid.
- The date is the `DTPOSTED` calendar date in the statement's own time zone. ofxtools converts times to UTC, which can move a date with a positive offset to the previous day, so the date is read from the source text.
- `TRNTYPE` is kept as the source type.
- The description is `NAME`, which is required. `MEMO` is stored unchanged in its own column and is not part of the description, so it is not displayed or sent to an LLM.
- Original file bytes, the content hash, and every import's transaction observations are retained. An exact re-upload is already imported.

A file is rejected when it is not readable OFX, contains other than one bank or credit card statement, is not in GBP or has a transaction in another currency, has no account identifier, or has no transactions. Transaction errors are reported by their position in the statement, and nothing is stored for an invalid file.

ofxtools logs and warns with statement contents, so its logging is limited to warnings and its warnings are suppressed while parsing.

## Supported export observations

These were confirmed against local exports without recording their contents:

| Source | Format | Identifiers | Notes |
| --- | --- | --- | --- |
| Amex | OFX 2 XML | `ORG`, `FID`, masked `ACCTID` | Midnight `DTPOSTED` in a US time zone. `MEMO` holds cardholder and card-number details, which is why it is not part of the description. `FITID` equals `REFNUM`. |
| Nationwide | OFX 2 XML | Masked `ACCTID`; `BANKID` is all zeroes | `DTPOSTED` has a fixed time with `[+1]` or `[+0]` offsets. Only `NAME`, up to 64 characters. |
| Nationwide Member Card | OFX 2 XML | `ACCTID` only | Same `DTPOSTED` format as the Nationwide current account. Only `NAME`. |
| NatWest | OFX 1 SGML | `BANKID`, `ACCTID` | Date-only `DTPOSTED`. `NAME` is truncated to 18 characters; `MEMO` is short and often repeats the start of `NAME`. |

Stable `FITID`s across overlapping exports have not been confirmed for these exports. The OFX specification requires them, but some institutions have been reported to regenerate them. If an overlapping import reports transactions as new that were already imported, `FITID`s are not stable for that export; fuzzy duplicate matching remains out of scope.

## API

- `GET /account-presets` lists `id`, `name`, `institution`, `account_type`, and `card_type`.
- `GET /accounts` includes each account's `preset`.
- `POST /imports` accepts a multipart `file` and optional `preset` and `name` fields:
  - `201` with the import id, account name, and new and existing transaction counts;
  - `409` with `detail` when the exact file was already imported;
  - `422` with `detail` and the statement's `card_type` when no saved account matches and no preset was sent;
  - `400` with `errors`, each with a `position` (`null` for file-level errors) and `message`, for an invalid file, an ambiguous account match, or a preset of the other card type.

A preset sent with a statement that already matches an account is ignored.

## Out of scope

- Other import formats, multi-account files, and non-GBP statements.
- Choosing an existing account for an unmatched statement, or entering OFX identifiers by hand.
- Fuzzy or date-window duplicate detection.
- Card theme designs, account settings, balances, and credit limits.
- Reprocessing stored imports after parser changes.
