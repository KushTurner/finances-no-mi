# Finances No MI

A local-only personal finance application for importing bank transactions, categorizing transactions, and reviewing financial activity.

## Repository layout

```text
apps/
  api/    FastAPI and SQLite backend
  web/    React frontend
docs/     Architecture records
```

## Requirements

- Node.js 24+
- pnpm 12+
- Python 3.11+
- uv

## Setup

```bash
pnpm install
cd apps/api
uv sync --group dev
uv run alembic upgrade head
```

## Development

Run the API from `apps/api`:

```bash
uv run uvicorn finances_api.main:app --reload
```

Run the frontend from the repository root:

```bash
pnpm --filter web dev
```

After importing statements, open **Transactions** to browse them, filter by category, and assign, change, or clear a category for selected rows. Category choices include their definitions. Decisions apply only to the selected transactions.

The Vite dev server proxies `/api` requests to the API at `http://127.0.0.1:8000`. Importing a statement creates the account for its bank the first time that bank is seen.

Run the isolated browser tests:

```bash
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e
```

Playwright starts only the frontend. API and external network requests are blocked unless a test explicitly provides a synthetic response.

For interactive browser exploration, start the frontend and use the project-local CLI in another terminal:

```bash
pnpm --filter web browser open http://127.0.0.1:5173
```

Local application data is stored under `.data/` and must never be committed.

## Documentation

- [Product](docs/product.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Transaction imports](docs/features/transaction-imports.md)
- [Transaction categorization](docs/features/transaction-categorization.md)
