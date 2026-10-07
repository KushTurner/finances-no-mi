# Roadmap

The roadmap is a sequence of small vertical slices, not a commitment to implement every item unchanged. Before starting a slice, confirm its scope against the product documents and implement only that slice.

## Completed

### Foundation

- React and TypeScript frontend with Vite, TanStack Router and Query, Tailwind, ESLint, Prettier, Vitest, and Playwright.
- FastAPI backend with SQLAlchemy, Alembic, Pydantic, pytest, Ruff, Pyright, and uv.
- SQLite schema for accounts, imports, transactions, merchants, categories, and suggestions.
- GitHub Actions verification and protected `main` branch.
- Mock-only browser testing that does not start the backend.

### Parse supported statements

- One parser contract producing canonical transaction candidates or row-specific validation failures.
- Amex, NatWest, and Nationwide adapters tested with synthetic fixtures.
- Source keys that preserve legitimate repeated transactions.

### Persist transaction imports

- Create and list local accounts through the API.
- Import a CSV for an existing account, storing the original bytes and content hash.
- Reject an exact file re-upload.
- Reuse transactions already observed in overlapping exports and record each file observation.
- Derive merchant keys with the shared whitespace and casing rule.
- Return counts of new and existing transactions, or row-specific validation errors.

### Add the import interface

- Drop or choose several CSVs at once.
- Detect each file's institution from its header row and import it into that institution's account, creating the account on first import.
- Display each file's account and its success, duplicate-file, or validation outcome.
- Proxy `/api` requests from the Vite dev server to the local API.
- Exercise the complete interface with mocked API responses and synthetic screenshots.

### Browse and categorize transactions manually

- Seeded the nine categories and definitions in [Transaction categorization](features/transaction-categorization.md), with a migration that preserves direct renames and reopens ambiguous legacy assignments for review.
- Added transaction-level category assignments and human decision metadata through Alembic.
- List transactions with account, date, signed amount, raw description, transaction type, and assigned category.
- Filter by category, including uncategorized transactions.
- Assign, correct, or clear a category for one transaction or an explicitly selected group.
- Keep categorization independent of merchant keys and preserve import identity and source data.
- Exercise the UI with mocked API responses and synthetic screenshots.

### Apply the Graphite design

- Added shadcn/ui with Radix primitives on top of Tailwind and the dark Graphite palette described in [Spending overview](features/spending-overview.md#visual-design).
- Restyled the Import and Transactions pages without changing their behaviour, using shadcn selects, checkboxes, cards, and tables.
- Moved Import to `/import` and added one navigation bar for Overview, Transactions, and Import, with a placeholder overview at `/`.
- Updated browser tests and synthetic screenshots for the new markup and routes.

### Show a spending overview

- Replaced the placeholder at `/` with the dark Graphite overview in [Spending overview](features/spending-overview.md): period presets (This month, Last month, Last 90 days, This year, Last 12 months) and selected accounts kept in the URL search parameters.
- Plain account cards that filter the whole page, scrolling sideways with previous and next controls when they do not fit.
- Spent, Income, Savings & investments, and Net for the range the summary API resolves, ending at the latest transaction. Savings is separate from spending. Complete periods are compared with the period of the same shape before them; This month and This year are not compared.
- A notice stating uncategorized spending counted and incoming money not counted, linking to the transactions page filtered to uncategorized.
- Spending pace, spending by category, monthly spending with the complete-month average, income and spending with the amount kept, and largest payments. Every chart has a table view.
- A hide-amounts toggle that masks every amount with one fixed mask, remembered in the browser.
- Browser tests run against a synthetic in-test API and attach desktop and mobile screenshots of every state.

## Planned

### 0. Benchmark category suggestions

- The starter runner uses LangChain model calls and LangSmith datasets and experiments;
  see [Categorization evals](evals.md) for setup.
- The 32 committed synthetic examples cover all nine categories and ambiguous inputs, with
  the user-selected category as the sole reference. Scoring reports accuracy, coverage,
  abstention and failures separately; automated tests stub external calls.
- Try the synthetic workflow, then define and test sanitization and permitted hosted storage
  before preparing a privately labelled representative sample.
- Compare model accuracy, suggestion coverage, failures, latency, and cost on a held-out set
  before choosing the first production model.

### 1. Suggest transaction categories

- Add a small LLM client behind an application interface.
- Choose the provider/model and implement the documented data boundary before making external requests.
- Let the user request suggestions for uncategorized transactions.
- Use description context, direction, transaction type, institution, and allowed category definitions.
- Accept only an allowed category or an explicit abstention; leave failed requests recoverable.
- Store transaction-level suggestions separately from assigned categories, with model/prompt versions for later evaluation.
- Show suggestions and allow individual approval or correction, retaining the prediction and review outcome.
- Stub every LLM call in automated tests.

### 2. Review suggestions in groups

- Group or filter pending suggestions by proposed category while keeping each transaction inspectable.
- Show distinct descriptions and transaction counts; allow excluding mismatches from a selection.
- Approve or correct selected transactions together, including payments involving different people or merchants.
- Apply decisions only to selected transactions; do not infer future matching rules from bulk approval.

### 3. Evaluate suggestions using reviewed examples

- Compare predictions with human decisions on later transactions, without exposing the answers in their suggestion context.
- Evaluate whether relevant previously reviewed examples improve suggestions.
- Define the permitted example context before sending any historical transaction information externally.
- Measure category errors and potential review reduction, including ambiguous personal payments.

### 4. Introduce selective automatic categorization

- Evaluate candidate approval thresholds while the user still reviews all predictions.
- Enable automatic assignment only where measured accuracy supports the chosen target with enough evidence.
- Distinguish automatic assignments from human-reviewed decisions, keep them correctable, and sample them for review.
- Re-evaluate when categories, prompts, or models change; do not treat automatic assignments as human-confirmed evidence.

## Deferred

- Account settings for account type, card design, and credit limit; account balances and credit-limit usage.
- Suggested own-account transfer pairs.
- Merchant search and conversational analysis over filtered transactions, with totals computed in code.
- Merchant aliases, reusable matching rules, and institution-specific description cleanup.
- Custom model training and any LangGraph workflow.
- Additional institutions and import formats.
- Editing imported source fields or historical import files. Category corrections are part of the planned workflow.
- Hosted deployment.
