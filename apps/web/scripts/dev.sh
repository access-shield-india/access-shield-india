#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/.env.local"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NEXT_BIN="$WEB_DIR/node_modules/next/dist/bin/next"
WIDGET_PUBLIC="$WEB_DIR/public/widget.js"

# Always refresh /widget.js so local/dev deploys pick up SDK changes
echo "Building widget bundle for /widget.js …" >&2
pnpm --filter @accessshield/widget build
mkdir -p "$WEB_DIR/public"
cp "$ROOT/apps/widget/dist/widget.min.js" "$WIDGET_PUBLIC"
if [[ -f "$ROOT/apps/widget/dist/widget.min.js.map" ]]; then
  cp "$ROOT/apps/widget/dist/widget.min.js.map" "$WEB_DIR/public/widget.js.map"
fi


# macOS defaults to 256 file descriptors; Next's watcher needs thousands or
# [locale] routes never register and every page 404s (EMFILE).
ulimit -n 10240 2>/dev/null || ulimit -n 4096 2>/dev/null || true
export WATCHPACK_POLLING="${WATCHPACK_POLLING:-1000}"
export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-1}"

ARGS=()
if [[ -f "$ENV_FILE" ]]; then
  ARGS=(--env-file="$ENV_FILE")
else
  echo "Warning: $ENV_FILE not found — copy .env.example to .env.local at the monorepo root." >&2
fi

exec node "${ARGS[@]}" "$NEXT_BIN" dev --port 3000
