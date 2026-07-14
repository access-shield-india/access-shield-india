#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/.env.local"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NEXT_BIN="$WEB_DIR/node_modules/next/dist/bin/next"
WIDGET_PUBLIC="$WEB_DIR/public/widget.js"

# Serve marketing widget from /widget.js when NEXT_PUBLIC_CDN_URL is unset
if [[ ! -f "$WIDGET_PUBLIC" ]]; then
  echo "Building widget bundle for /widget.js …" >&2
  pnpm --filter @accessshield/widget build
  mkdir -p "$WEB_DIR/public"
  cp "$ROOT/apps/widget/dist/widget.min.js" "$WIDGET_PUBLIC"
fi

ARGS=()
if [[ -f "$ENV_FILE" ]]; then
  ARGS=(--env-file="$ENV_FILE")
else
  echo "Warning: $ENV_FILE not found — copy .env.example to .env.local at the monorepo root." >&2
fi

exec node "${ARGS[@]}" "$NEXT_BIN" dev --port 3000
