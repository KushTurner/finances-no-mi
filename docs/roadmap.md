# Roadmap

The roadmap is a sequence of small vertical slices, not a commitment to implement every item unchanged. Before starting a slice, confirm its scope against the product documents and implement only that slice.

## Completed

### Foundation

- React and TypeScript frontend with Vite, TanStack Router and Query, Tailwind, ESLint, Prettier, Vitest, and Playwright.
- FastAPI backend with SQLAlchemy, Alembic, Pydantic, pytest, Ruff, Pyright, and uv.
- SQLite schema for accounts, imports, transactions, merchants, categories, and suggestions.
- GitHub Actions verification and protected `main` branch.
- Mock-only browser testing that does not start the backend.

## Planned

### 1. Parse supported statements

- Define one parser contract that produces canonical transaction candidates.
- Implement Amex, NatWest, and Nationwide adapters using synthetic fixtures.
- Generate stable source keys that preserve legitimate repeated transactions.
- Return row-specific validation failures without persisting anything.

### 2. Persist transaction imports

- Import a CSV for an existing account through the API.
- Store the original file and its content hash locally.
- Reject an exact file re-upload.
- Reuse transactions already observed in overlapping exports and record each file observation.
- Return a small import result containing counts and validation errors.

### 3. Add the import interface

- Select an account and upload a CSV.
- Display success, duplicate-file, and validation outcomes.
- Exercise the complete interface with mocked API responses and synthetic screenshots.

### 4. Add manual transactions

- Enter savings transactions without a CSV.
- Give each manual transaction an immutable generated source key.
- Apply the same amount, merchant-key, and persistence rules as imported transactions.

### 5. Resolve merchant keys with deterministic rules

- Apply institution-specific regex rules to raw descriptions.
- Reuse approved mappings for known merchant keys.
- Expose unresolved merchant keys for review.

### 6. Suggest unresolved merchants

- Add a small LLM client behind an application interface.
- Request structured merchant, category, and confidence output.
- Persist at most one current suggestion for each unresolved merchant key.
- Stub every LLM call in automated tests.

### 7. Review merchant suggestions

- List pending suggestions in the frontend.
- Approve a suggestion or correct its merchant and category.
- Remove the pending suggestion after the merchant key is resolved.

### 8. Browse transactions

- Display transactions in a sortable, filterable table.
- Show account, date, amount, raw description, merchant, and category.
- Choose a table library only when implementing this slice.

## Deferred

- Monthly summaries.
- Conversational analysis and any LangGraph workflow.
- Additional institutions and import formats.
- Editing historical imports or transactions.
- Hosted deployment.
