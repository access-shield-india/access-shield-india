#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"
NEXT_BIN="$WEB_DIR/node_modules/next/dist/bin/next"
WIDGET_PUBLIC="$WEB_DIR/public/widget.js"

# Embeddable SDK — must exist under public/ before next build copies static assets.
echo "Building widget bundle for /widget.js …" >&2
pnpm --filter @accessshield/widget build
mkdir -p "$WEB_DIR/public"
cp "$ROOT/apps/widget/dist/widget.min.js" "$WIDGET_PUBLIC"
if [[ -f "$ROOT/apps/widget/dist/widget.min.js.map" ]]; then
  cp "$ROOT/apps/widget/dist/widget.min.js.map" "$WEB_DIR/public/widget.js.map"
fi

ARGS=()
if [[ -f "$ENV_FILE" ]]; then
  ARGS=(--env-file="$ENV_FILE")
fi

exec node "${ARGS[@]}" "$NEXT_BIN" build
