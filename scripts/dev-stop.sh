#!/usr/bin/env bash
# Stop AccessShield host apps (ports + common process patterns).
# Used standalone or by scripts/deploy.sh stop logic (similar behaviour).
set -euo pipefail

PORTS=(3000 4000 8000 8001)

kill_tree() {
  local pid="$1"
  [[ -n "$pid" ]] || return 0
  kill -0 "$pid" 2>/dev/null || return 0
  local children
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  local c
  for c in $children; do
    kill_tree "$c"
  done
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  sleep 0.2
  kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
}

pids_on_port() {
  local port="$1"
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || lsof -ti ":$port" 2>/dev/null || true)"
  fi
  if [[ -z "$pids" ]] && command -v ss >/dev/null 2>&1; then
    pids="$(ss -lptn "sport = :$port" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)"
  fi
  printf '%s\n' $pids | awk 'NF && !seen[$0]++' | tr '\n' ' '
}

echo "Stopping stray app process patterns…"
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "tsx watch src/scanner/worker-entry" 2>/dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "next dist/bin/next" 2>/dev/null || true
sleep 1

for port in "${PORTS[@]}"; do
  for _ in 1 2 3 4 5; do
    pids="$(pids_on_port "$port")"
    if [[ -z "${pids// /}" ]]; then
      echo "Port $port is free"
      break
    fi
    echo "Stopping process(es) on port $port: $pids"
    for p in $pids; do
      kill_tree "$p"
    done
    if command -v fuser >/dev/null 2>&1; then
      fuser -k "${port}/tcp" 2>/dev/null || true
    fi
    sleep 0.5
  done
done

# Clear deploy pidfiles if present
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -f "$ROOT/.deploy/pids"/*.pid 2>/dev/null || true

echo "Done. Run './scripts/deploy.sh --no-pull' or 'pnpm dev' to start fresh."
