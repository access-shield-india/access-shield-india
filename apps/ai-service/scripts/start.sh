#!/usr/bin/env bash
# Start ai-service (uvicorn). Used by scripts/deploy.sh.
# Usage:
#   ./scripts/start.sh              # production-style (no reload)
#   ./scripts/start.sh --reload     # dev
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv"
MONOREPO_ROOT="$(cd "$ROOT/../.." && pwd)"
PORT="${AI_SERVICE_PORT:-8001}"
RELOAD=0

for arg in "$@"; do
  case "$arg" in
    --reload) RELOAD=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$VENV/bin/activate" ]]; then
  echo "Missing venv at $VENV — run: pnpm --filter @accessshield/ai-service dev once, or deploy.sh" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"

if [[ -f "$MONOREPO_ROOT/.env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$MONOREPO_ROOT/.env.local"
  set +a
fi

if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" == postgresql://* ]]; then
  export DATABASE_URL="postgresql+asyncpg://${DATABASE_URL#postgresql://}"
fi

cd "$ROOT"

if [[ "$RELOAD" -eq 1 ]]; then
  exec uvicorn main:app --reload --host 0.0.0.0 --port "$PORT"
fi
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
