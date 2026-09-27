# Finances No MI

A local-only personal finance application for importing bank transactions, resolving merchants, and reviewing financial activity.

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

Local application data is stored under `.data/` and must never be committed.
