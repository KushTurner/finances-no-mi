#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
export FINANCES_API_URL="${FINANCES_API_URL:-http://127.0.0.1:8000}"

cd "$root/apps/api"
uv run alembic upgrade head

trap 'kill 0' EXIT
uv run uvicorn finances_api.main:app --reload &

cd "$root"
pnpm --filter web dev
