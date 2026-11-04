#!/usr/bin/env bash
# Prod deploy for the scan box only: worker, mobile-scanner, ai-service.
# No Docker. Postgres, Redis, RabbitMQ, and MinIO stay on machine 3.
#
#   ./scripts/deploy-scan.sh
#   ./scripts/deploy-scan.sh --no-pull
#   DEPLOY_BRANCH=main ./scripts/deploy-scan.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_DIR="$ROOT/.deploy"
LOG_DIR="$DEPLOY_DIR/logs"
PID_DIR="$DEPLOY_DIR/pids"
DO_PULL=1

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    -h|--help)
      echo "Usage: ./scripts/deploy-scan.sh [--no-pull]"
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR" "$PID_DIR"
[[ -f "$ROOT/.env.local" ]] || { echo "Missing .env.local" >&2; exit 1; }
[[ -f "$ROOT/apps/ai-service/.env" ]] || { echo "Missing apps/ai-service/.env" >&2; exit 1; }

if [[ "$DO_PULL" -eq 1 ]]; then
  [[ -z "$(git status --porcelain 2>/dev/null || true)" ]] || { echo "Working tree is dirty" >&2; exit 1; }
  if [[ -n "${DEPLOY_BRANCH:-}" ]]; then
    git fetch origin
    git checkout "$DEPLOY_BRANCH"
    git pull --ff-only origin "$DEPLOY_BRANCH"
  else
    git pull --ff-only
  fi
fi

pnpm install
pnpm --filter @accessshield/types build
pnpm --filter @accessshield/db build
pnpm --filter @accessshield/api build
pnpm --filter @accessshield/mobile-scanner build

ai_root="$ROOT/apps/ai-service"
venv="$ai_root/.venv"
if [[ ! -x "$venv/bin/python" ]] || ! "$venv/bin/python" -c "import uvicorn" >/dev/null 2>&1; then
  python3 -m venv "$venv"
  "$venv/bin/python" -m pip install -q --upgrade pip
  "$venv/bin/python" -m pip install -q -e "$ai_root[local]"
fi

stop_one() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"
  [[ -f "$pidfile" ]] || return 0
  local pid
  pid="$(tr -d '[:space:]' <"$pidfile")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    sleep 1
    kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$pidfile"
}

stop_one worker
stop_one mobile
stop_one ai
pkill -f "dist/scanner/worker-entry" 2>/dev/null || true
pkill -f "mobile-scanner/dist/index.js" 2>/dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true
sleep 1

start_bg() {
  local name="$1"
  shift
  : >"$LOG_DIR/$name.log"
  (
    cd "$ROOT"
    setsid nohup "$@" >>"$LOG_DIR/$name.log" 2>&1 </dev/null &
    echo $! >"$PID_DIR/$name.pid"
  )
  sleep 1
  echo "started $name pid $(tr -d '[:space:]' <"$PID_DIR/$name.pid") log $LOG_DIR/$name.log"
}

start_bg worker pnpm --filter @accessshield/api start:worker
start_bg mobile pnpm --filter @accessshield/mobile-scanner start
chmod +x "$ROOT/apps/ai-service/scripts/start.sh"
start_bg ai "$ROOT/apps/ai-service/scripts/start.sh"

sleep 2
curl -sf --max-time 5 "http://127.0.0.1:${AI_SERVICE_PORT:-8001}/health" || echo "AI /health not ready yet — see $LOG_DIR/ai.log"