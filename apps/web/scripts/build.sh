#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/.env.local"
NEXT_BIN="$(cd "$(dirname "$0")/.." && pwd)/node_modules/next/dist/bin/next"

ARGS=()
if [[ -f "$ENV_FILE" ]]; then
  ARGS=(--env-file="$ENV_FILE")
fi

exec node "${ARGS[@]}" "$NEXT_BIN" build
