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

## Planned

### 1. Resolve merchant keys with deterministic rules

- Apply institution-specific regex rules to raw descriptions.
- Reuse approved mappings for known merchant keys.
- Expose unresolved merchant keys for review.

### 2. Suggest unresolved merchants

- Add a small LLM client behind an application interface.
- Request structured merchant, category, and confidence output.
- Persist at most one current suggestion for each unresolved merchant key.
- Stub every LLM call in automated tests.

### 3. Review merchant suggestions

- List pending suggestions in the frontend.
- Approve a suggestion or correct its merchant and category.
- Remove the pending suggestion after the merchant key is resolved.

### 4. Browse transactions

- Display transactions in a sortable, filterable table.
- Show account, date, amount, raw description, merchant, and category.
- Choose a table library only when implementing this slice.

## Deferred

- Monthly summaries.
- Conversational analysis and any LangGraph workflow.
- Additional institutions and import formats.
- Editing historical imports or transactions.
- Hosted deployment.
