#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv"

if [[ ! -f "$VENV/bin/activate" ]]; then
  echo "Run 'pnpm --filter @accessshield/ai-service dev' first to create the venv." >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"
cd "$ROOT"
exec "$@"
