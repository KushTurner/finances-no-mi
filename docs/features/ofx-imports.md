# OFX Imports

## Status and scope

This is the agreed plan for replacing the [implemented CSV importer](transaction-imports.md). It is not implemented yet.

Build an OFX-only import flow and schema. There is no production transaction data to migrate, so CSV compatibility, fingerprint identities, and legacy-data backfills are not required. Use Alembic for the schema changes.

Use one shared OFX parser and one shared account matcher for every supported account. The parser candidate is [ofxtools](https://github.com/csingley/ofxtools), which handles OFX 1 SGML and OFX 2 XML. An isolated trial parsed exports from Amex, NatWest, and Nationwide successfully.

## User flow

1. The user drops or chooses an OFX file.
2. The backend parses and validates the complete statement, including its account metadata.
3. A clear match to a saved account imports directly, without an account selector.
4. An unmatched statement opens **Add account**. The user chooses a predefined card/account preset, which sets the institution, account type, and theme, and can enter an optional nickname that defaults to the preset's display name.
5. After the user adds the account, the backend saves its OFX identifiers and imports the statement in the same database transaction.
6. Later matching uploads import directly into that account.

There is no existing-account selector in the unmatched-file flow. The catalogue supplies debit/credit information, and parsed account type can narrow the preset choices. The user does not enter account numbers or OFX fields.

Each uploaded file has its own outcome: imported with new/existing transaction counts, already imported, needs account setup, or invalid. The frontend retains a file while account setup is pending and resubmits it with the selected preset and nickname. Pending setup does not create an account or persist an import.

## Initial account presets

The initial catalogue contains these three presets:

| Preset | Institution | Account type |
| --- | --- | --- |
| American Express Gold | `amex` | `credit_card` |
| Nationwide FlexOne | `nationwide` | `current_account` (debit card) |
| NatWest Select | `natwest` | `current_account` (debit card) |

Each preset supplies its display name, institution, account type, and theme. The default account name is the preset's display name, with the optional nickname overriding it. Debit/credit is part of the preset rather than a separate form field.

Adding another preset extends the catalogue; it does not add a new OFX parser or matching function. Two accounts using the same preset remain separate account records matched by their OFX identifiers.

## Account identity

Account metadata belongs to the statement, not to an individual transaction. Read these standard fields through the same parser:

- `ACCTID`: account identifier.
- `BANKID`: bank/branch identifier, when supplied.
- `ORG` and `FID`: financial institution identifiers, when supplied.

Store the supplied values on the account and match using `ACCTID` together with meaningful bank identifiers. Treat missing values and placeholders such as `BANKID=0` as absent bank information. Account identifiers are strings; preserve leading zeroes, punctuation, and masking characters.

Each account has its own internal database `id`, institution, account type, preset, and display name. Accounts from the same institution remain separate records. Neither institution nor display name is a globally unique account key. Do not make `acctid` alone globally unique or generate a UUID or hash from the OFX fields.

The initial exports expose different subsets of the same standard metadata:

| Source | Meaningful identifying fields |
| --- | --- |
| Amex | `ORG`, `FID`, `ACCTID` |
| NatWest | `BANKID`, `ACCTID` |
| Nationwide | Masked `ACCTID`; its `BANKID` is a placeholder |

Available identifiers are matching evidence, not a guarantee that every export uniquely identifies an account. Identical masked identifiers cannot distinguish two accounts. An ambiguous match must not silently import or create another account; return a clear account-identification error. Resolving accounts that export indistinguishable identifiers is outside this initial flow.

## Transaction identity and canonical values

Store the bank's `FITID` directly in a `fitid` column. It identifies a transaction within its account. Enforce `UNIQUE (account_id, fitid)` and reuse a transaction observed in another statement. Different accounts may have the same `FITID`, and transactions with distinct `FITID` values remain separate even when their dates, amounts, and descriptions match.

Replace the CSV `source_key` naming and fingerprint/occurrence-suffix machinery. File identity remains separate: retain original OFX bytes, the content hash, and each import's transaction observations. An exact file re-upload is already imported; overlapping statements reuse existing transactions.

Convert the library's parsed values into the application's canonical transaction model:

- GBP monetary values are signed integer pence, with spending negative and income/refunds positive.
- Preserve the source transaction date and bank transaction type.
- Preserve `NAME` and `MEMO` context when constructing the description, without duplicating identical text.
- Require a usable account identifier and transaction `FITID` values.
- Initially support one account per file and GBP statements; reject unsupported input clearly.
- Validate before writing and persist an accepted import atomically.

Parsing, normalization, persistence, and classification remain separate concerns. The model/eval input uses the same standardized transaction context; OFX is the upload format, not the LLM payload.

## Implementation and verification

- Replace the bank-specific CSV adapters with the shared OFX adapter.
- Add account identifiers and the preset reference, and replace transaction `source_key` with `fitid`, through Alembic.
- Update the import service/API for direct imports and account-setup responses, and add the preset catalogue.
- Update upload acceptance, Add account, account display/theming, demo data, and affected documentation.
- Keep OFX files, local statements, databases, and credentials out of Git. Tests, demos, documentation examples, and browser screenshots use synthetic data.
- Verify overlapping exports, exact re-uploads, distinct same-valued transactions, multiple accounts at one institution, account setup, ambiguous identifiers, and invalid-file rollback.
- Run the required backend/frontend checks and review the mocked browser report and screenshots for UI changes.

The initial preset catalogue is confirmed above. Remaining real-file verification is to check a repeated or overlapping export for stable `FITID` values. A second Nationwide export should also confirm that its masked `ACCTID` remains consistent. These checks use local files without logging their contents or identifiers.
