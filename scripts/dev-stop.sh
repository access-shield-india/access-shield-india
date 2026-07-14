#!/usr/bin/env bash
# Stop local dev servers on default AccessShield ports.
set -euo pipefail

PORTS=(3000 4000 8000 8001)

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Stopping process(es) on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
  else
    echo "Port $port is free"
  fi
done

echo "Done. Run 'pnpm dev' to start fresh."
