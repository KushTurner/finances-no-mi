#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
demo_database="$root/.data/demo.db"
export FINANCES_DATABASE_URL="sqlite:///$demo_database"
export FINANCES_API_URL="http://127.0.0.1:8001"

rm -f "$demo_database"
cd "$root/apps/api"
uv run alembic upgrade head
uv run python -m finances_api.demo_data

trap 'kill 0' EXIT
uv run uvicorn finances_api.main:app --port 8001 &
cd "$root"
pnpm --filter web dev
