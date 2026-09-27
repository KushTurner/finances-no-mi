# Project guidance

## Delivery

- Prefer established CLI tools. Use `git` for version control and `gh` for GitHub operations.
- Implement the smallest complete solution that satisfies the request.
- Do not add speculative features, abstractions, dependencies, infrastructure, or adjacent refactors.
- Keep independent feature work on a dedicated branch based on the latest `origin/main`.
- Open a pull request for changes. Never commit or push directly to `main`.
- Do not merge a pull request unless the user explicitly requests it.

## Security and data

- Never commit PII, financial statements, real transaction data, credentials, API keys, secrets, or private keys.
- Use synthetic data in tests, examples, fixtures, screenshots, and documentation.
- Do not log uploaded file contents, account identifiers, or transaction descriptions.
- Keep local databases, uploaded files, `.env` files, and CSV files out of Git.

## Code

- Prefer clear names, small functions, and explicit control flow over comments or explanatory docstrings.
- Add a comment only when an external constraint cannot be expressed clearly in code or tests.
- Keep financial parsing, normalization, persistence, and classification as separate concerns.
- Store GBP monetary values as integer pence. Income and refunds are positive; spending and withdrawals are negative.
- Use Alembic for schema changes. Do not use `create_all()` for application schema management.
- SQLAlchemy ORM is appropriate for ordinary persistence. Use SQLAlchemy Core or parameterized SQL when it is clearer.

## Tests

- Test business behaviour rather than framework implementation.
- Structure tests as Arrange, Act, Assert, separated by whitespace without section comments.
- Prefer one behavioural assertion and one literal assertion when practical.
- Multiple assertions are acceptable when they jointly prove one outcome.
- Keep setup short and readable. Use focused fixtures, factories, or builders only when they improve clarity.
- Keep tests deterministic and independent. Stub external LLM calls in the normal test suite.

## Verification

- Frontend: `pnpm --filter web lint`, `pnpm --filter web format:check`, `pnpm --filter web typecheck`, `pnpm --filter web test`, and `pnpm --filter web build`.
- Backend, from `apps/api`: `uv run ruff check .`, `uv run ruff format --check .`, `uv run pyright`, `uv run pytest`, `uv run alembic upgrade head`, and `uv run alembic check`.
