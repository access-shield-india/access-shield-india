#!/usr/bin/env bash
# AccessShield India — single-box deploy (Docker infra + host apps)
#
# One script for routine updates. Migrations run by default (before app restart).
# Full AWS / multi-region prod is still the checklist in docs/architecture/11-deployment-guide.md
# Part B — this script targets the Compose + host model in 12-linux-server-setup.md.
#
# Modes (same machine, different process style):
#   --mode=dev   (default)  tsx/next/uvicorn --reload  — developer / staging box
#   --mode=prod             build + start (no reload) — still single-box, not ECS/Vercel
#
# Usage:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --mode=prod --with-local-llm
#   ./scripts/deploy.sh --migrate-only
#   ./scripts/deploy.sh --bootstrap --no-pull
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Next/tsx file watchers need more than macOS default (256). Without this,
# web compiles /_not-found for every route (EMFILE: too many open files).
ulimit -n 10240 2>/dev/null || ulimit -n 4096 2>/dev/null || true

DEPLOY_DIR="$ROOT/.deploy"
LOG_DIR="$DEPLOY_DIR/logs"
PID_DIR="$DEPLOY_DIR/pids"
INFRA_SERVICES=(postgres redis rabbitmq tika keycloak minio minio-init mailpit)

MODE="dev"
DO_PULL=1
DO_INFRA=1
DO_INSTALL=1
DO_BUILD=1
DO_MIGRATE=1
DO_RESTART=1
DO_BOOTSTRAP=0
WITH_LOCAL_LLM=0
SKIP_AI=0
SKIP_WORKER=0
SKIP_MOBILE=0
SKIP_WEB=0
SKIP_API=0
MIGRATE_ONLY=0
INFRA_ONLY=0

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
NC=$'\033[0m'

log()  { printf '%s\n' "$*"; }
ok()   { printf '%s✓%s %s\n' "$GREEN" "$NC" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$NC" "$*"; }
die()  { printf '%s✗%s %s\n' "$RED" "$NC" "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
AccessShield deploy — pull, build, migrate, restart (single Linux box)

Usage: ./scripts/deploy.sh [options]

Modes:
  --mode=dev|prod     Process style (default: dev). prod = build + start, no reload.

Steps (toggle):
  --no-pull           Skip git pull
  --infra-only        Only docker compose up + wait healthy
  --migrate-only      Only run DB migrations (requires Postgres up)
  --no-restart        Pull/build/migrate but do not stop/start apps
  --bootstrap         Also run db:seed + scripts/seed-sysadmin.sh (first box only)

Apps:
  --with-local-llm    Ensure ai-service venv has pip install '.[local]'
  --skip-ai           Do not restart AI service
  --skip-worker       Do not restart web scan worker
  --skip-mobile       Do not restart mobile-scanner worker
  --skip-web          Do not restart web
  --skip-api          Do not restart API

Other:
  -h, --help          Show this help

Env:
  DEPLOY_BRANCH       If set, git checkout / pull that branch (default: current)
  AI_SERVICE_PORT     Default 8001

Examples:
  ./scripts/deploy.sh
  ./scripts/deploy.sh --mode=prod --with-local-llm
  ./scripts/deploy.sh --migrate-only
  ./scripts/deploy.sh --bootstrap
EOF
}

for arg in "$@"; do
  case "$arg" in
    --mode=dev) MODE=dev ;;
    --mode=prod) MODE=prod ;;
    --mode=*) die "Unknown mode: $arg (use --mode=dev or --mode=prod)" ;;
    --no-pull) DO_PULL=0 ;;
    --infra-only) INFRA_ONLY=1 ;;
    --migrate-only) MIGRATE_ONLY=1 ;;
    --no-restart) DO_RESTART=0 ;;
    --bootstrap) DO_BOOTSTRAP=1 ;;
    --with-local-llm) WITH_LOCAL_LLM=1 ;;
    --skip-ai) SKIP_AI=1 ;;
    --skip-worker) SKIP_WORKER=1 ;;
    --skip-mobile) SKIP_MOBILE=1 ;;
    --skip-web) SKIP_WEB=1 ;;
    --skip-api) SKIP_API=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $arg (try --help)" ;;
  esac
done

if [[ "$MIGRATE_ONLY" -eq 1 ]]; then
  DO_PULL=0
  DO_INFRA=0
  DO_INSTALL=0
  DO_BUILD=0
  DO_RESTART=0
  DO_BOOTSTRAP=0
  DO_MIGRATE=1
fi

if [[ "$INFRA_ONLY" -eq 1 ]]; then
  DO_PULL=0
  DO_INSTALL=0
  DO_BUILD=0
  DO_MIGRATE=0
  DO_RESTART=0
  DO_BOOTSTRAP=0
  DO_INFRA=1
fi

mkdir -p "$LOG_DIR" "$PID_DIR"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

wait_for_postgres() {
  local tries=60
  log "Waiting for Postgres…"
  for ((i = 1; i <= tries; i++)); do
    if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
      ok "Postgres ready"
      return 0
    fi
    sleep 2
  done
  die "Postgres did not become ready in time"
}

wait_for_keycloak() {
  local tries=90
  log "Waiting for Keycloak (may take a minute)…"
  for ((i = 1; i <= tries; i++)); do
    if curl -sf "http://127.0.0.1:8080/health/ready" >/dev/null 2>&1 \
      || curl -sf "http://127.0.0.1:8080/" >/dev/null 2>&1; then
      ok "Keycloak responding"
      return 0
    fi
    sleep 2
  done
  warn "Keycloak not ready yet — continue; login may fail until it is"
}

kill_tree() {
  # Kill a PID and its descendants (pnpm → node/tsx children often hold the port).
  local pid="$1"
  [[ -n "$pid" ]] || return 0
  if ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  local children
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  local c
  for c in $children; do
    kill_tree "$c"
  done

  # Prefer killing the process group if this PID is a session/group leader
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  sleep 0.3
  kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
}

kill_pidfile() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(tr -d '[:space:]' <"$pidfile" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]]; then
      log "Stopping $name (pid $pid + children)…"
      kill_tree "$pid"
    fi
    rm -f "$pidfile"
  fi
}

pids_on_port() {
  local port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -z "$pids" ]]; then
      pids="$(lsof -ti ":$port" 2>/dev/null || true)"
    fi
  fi

  if [[ -z "$pids" ]] && command -v fuser >/dev/null 2>&1; then
    # fuser prints "1234" or "1234 5678" on stdout when using -v differently; -k returns PIDs on some systems
    pids="$(fuser "${port}/tcp" 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true)"
  fi

  if [[ -z "$pids" ]] && command -v ss >/dev/null 2>&1; then
    pids="$(
      ss -lptn "sport = :$port" 2>/dev/null \
        | grep -oE 'pid=[0-9]+' \
        | cut -d= -f2 \
        | sort -u \
        || true
    )"
  fi

  # Deduplicate
  printf '%s\n' $pids | awk 'NF && !seen[$0]++' | tr '\n' ' '
}

free_port() {
  local port="$1"
  local tries=15
  local i pids

  for ((i = 1; i <= tries; i++)); do
    pids="$(pids_on_port "$port")"
    if [[ -z "${pids// /}" ]]; then
      return 0
    fi
    log "Freeing port $port (attempt $i/$tries, pids: $pids)…"
    local p
    for p in $pids; do
      kill_tree "$p"
    done
    if command -v fuser >/dev/null 2>&1; then
      fuser -k -TERM "${port}/tcp" 2>/dev/null || true
      sleep 0.5
      fuser -k -KILL "${port}/tcp" 2>/dev/null || true
    fi
    sleep 0.5
  done

  pids="$(pids_on_port "$port")"
  if [[ -n "${pids// /}" ]]; then
    die "Port $port still in use after kill attempts (pids: $pids). Stop them manually, then re-run."
  fi
}

kill_stray_app_procs() {
  # Catch processes started outside deploy (no pidfile) or orphaned after parent died.
  log "Stopping stray AccessShield app processes…"
  # Patterns scoped to this repo path where possible
  local patterns=(
    "tsx watch src/index.ts"
    "tsx watch src/scanner/worker-entry"
    "dist/scanner/worker-entry"
    "mobile-scanner/src/index.ts"
    "mobile-scanner/dist/index.js"
    "next dist/bin/next dev --port 3000"
    "next dist/bin/next start --port 3000"
    "uvicorn main:app"
    "apps/ai-service/scripts/start.sh"
  )
  local pat
  for pat in "${patterns[@]}"; do
    pkill -f "$pat" 2>/dev/null || true
  done
  # pnpm filter wrappers that may linger
  pkill -f "pnpm --filter @accessshield/api" 2>/dev/null || true
  pkill -f "pnpm --filter @accessshield/web" 2>/dev/null || true
  pkill -f "pnpm --filter @accessshield/ai-service" 2>/dev/null || true
  pkill -f "pnpm --filter @accessshield/mobile-scanner" 2>/dev/null || true
  sleep 1
}

assert_port_free() {
  local port="$1"
  local pids
  pids="$(pids_on_port "$port")"
  if [[ -n "${pids// /}" ]]; then
    die "Port $port still busy (pids: $pids) before start"
  fi
}

start_bg() {
  local name="$1"
  shift
  local logfile="$LOG_DIR/$name.log"
  local pidfile="$PID_DIR/$name.pid"
  log "Starting $name → $logfile"
  : >"$logfile"
  (
    cd "$ROOT"
    # New session so we can kill the whole tree with kill -TERM -$pid later.
    # setsid is Linux-only; on macOS fall back to nohup (kill_tree still kills the pid).
    if command -v setsid >/dev/null 2>&1; then
      setsid nohup "$@" >>"$logfile" 2>&1 </dev/null &
    else
      nohup "$@" >>"$logfile" 2>&1 </dev/null &
    fi
    echo $! >"$pidfile"
  )
  sleep 1
  local pid
  pid="$(tr -d '[:space:]' <"$pidfile")"
  if kill -0 "$pid" 2>/dev/null; then
    ok "$name started (pid $pid)"
  else
    warn "$name may have exited — check $logfile"
  fi
}

ensure_ai_venv() {
  local ai_root="$ROOT/apps/ai-service"
  local venv="$ai_root/.venv"
  local py=""
  for cmd in python3.12 python3.11 python3.13 python3; do
    if command -v "$cmd" >/dev/null 2>&1; then
      local ver
      ver="$("$cmd" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
      local major="${ver%%.*}"
      local minor="${ver#*.}"
      if (( major == 3 && minor >= 11 && minor <= 13 )); then
        py="$cmd"
        break
      fi
    fi
  done
  [[ -n "$py" ]] || die "Python 3.11–3.13 required for ai-service"

  if [[ ! -d "$venv" ]]; then
    log "Creating ai-service venv ($py)…"
    "$py" -m venv "$venv"
  fi

  # shellcheck source=/dev/null
  source "$venv/bin/activate"
  if ! python -c "import uvicorn" >/dev/null 2>&1; then
    log "Installing ai-service dependencies…"
    pip install -q --upgrade pip
    pip install -q -e "$ai_root[dev]"
  fi

  if [[ "$WITH_LOCAL_LLM" -eq 1 ]] || should_install_local_llm; then
    log "Ensuring local LLM extras (llama-cpp)…"
    pip install -q -e "$ai_root[local]"
  fi
  deactivate 2>/dev/null || true
}

should_install_local_llm() {
  local envf="$ROOT/apps/ai-service/.env"
  [[ -f "$envf" ]] || return 1
  if grep -qiE '^[[:space:]]*LOCAL_LLM_WARMUP[[:space:]]*=[[:space:]]*true' "$envf"; then
    return 0
  fi
  if grep -qiE '^[[:space:]]*DEFAULT_AI_PROVIDER[[:space:]]*=[[:space:]]*local' "$envf"; then
    return 0
  fi
  return 1
}

run_pull() {
  require_cmd git
  if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    die "Working tree is dirty — commit/stash first, or use --no-pull"
  fi
  if [[ -n "${DEPLOY_BRANCH:-}" ]]; then
    log "Checking out $DEPLOY_BRANCH…"
    git fetch origin
    git checkout "$DEPLOY_BRANCH"
    git pull --ff-only origin "$DEPLOY_BRANCH"
  else
    local branch
    branch="$(git rev-parse --abbrev-ref HEAD)"
    log "Pulling $branch (ff-only)…"
    git pull --ff-only
  fi
  ok "Git up to date ($(git rev-parse --short HEAD))"
}

run_infra() {
  require_cmd docker
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 required (docker compose)"
  log "Starting infra: ${INFRA_SERVICES[*]}"
  docker compose up -d "${INFRA_SERVICES[@]}"
  wait_for_postgres
  wait_for_keycloak
}

run_install() {
  require_cmd pnpm
  log "pnpm install…"
  pnpm install
  ok "Dependencies installed"
}

publish_widget() {
  log "Building widget → apps/web/public/widget.js…"
  pnpm --filter @accessshield/widget build
  mkdir -p "$ROOT/apps/web/public"
  cp "$ROOT/apps/widget/dist/widget.min.js" "$ROOT/apps/web/public/widget.js"
  if [[ -f "$ROOT/apps/widget/dist/widget.min.js.map" ]]; then
    cp "$ROOT/apps/widget/dist/widget.min.js.map" "$ROOT/apps/web/public/widget.js.map"
  fi
  ok "Widget published to /widget.js"
}

run_build_packages() {
  log "Building shared packages…"
  pnpm --filter @accessshield/types build
  pnpm --filter @accessshield/db build
  pnpm --filter @accessshield/ui build
  ok "Packages built"

  # Always ship a fresh embed bundle (gitignored; not covered by web build alone).
  publish_widget

  if [[ "$MODE" == "prod" ]]; then
    log "Building API + Web (prod mode)…"
    pnpm --filter @accessshield/api build
    pnpm --filter @accessshield/web build
    pnpm --filter @accessshield/mobile-scanner build
    ok "API + Web + mobile-scanner built"
  fi
}

run_migrate() {
  [[ -f "$ROOT/.env.local" ]] || die "Missing .env.local at repo root (needed for DATABASE_URL)"
  log "Running DB migrations…"
  pnpm --filter @accessshield/db exec drizzle-kit migrate
  ok "Migrations applied"
}

run_bootstrap() {
  warn "Bootstrap: seeding DB + Keycloak sysadmin (first-time only)"
  pnpm db:seed
  if [[ -x "$ROOT/scripts/seed-sysadmin.sh" ]]; then
    "$ROOT/scripts/seed-sysadmin.sh"
  else
    bash "$ROOT/scripts/seed-sysadmin.sh"
  fi
  ok "Bootstrap complete"
}

stop_apps() {
  log "Stopping app processes…"
  kill_pidfile api
  kill_pidfile web
  kill_pidfile worker
  kill_pidfile mobile
  kill_pidfile ai
  kill_stray_app_procs
  free_port 3000
  free_port 4000
  free_port "${AI_SERVICE_PORT:-8001}"
  free_port 8000
  assert_port_free 3000
  assert_port_free 4000
  if [[ "$SKIP_AI" -eq 0 ]]; then
    assert_port_free "${AI_SERVICE_PORT:-8001}"
  fi
  ok "Ports free"
}

start_apps() {
  [[ -f "$ROOT/.env.local" ]] || die "Missing .env.local"

  if [[ "$SKIP_API" -eq 0 ]]; then
    if [[ "$MODE" == "prod" ]]; then
      start_bg api pnpm --filter @accessshield/api start
    else
      start_bg api pnpm --filter @accessshield/api dev
    fi
  fi

  if [[ "$SKIP_WEB" -eq 0 ]]; then
    if [[ "$MODE" == "prod" ]]; then
      start_bg web bash -c 'cd apps/web && node --env-file="../../.env.local" ./node_modules/next/dist/bin/next start --port 3000'
    else
      start_bg web pnpm --filter @accessshield/web dev
    fi
  fi

  if [[ "$SKIP_WORKER" -eq 0 ]]; then
    if [[ "$MODE" == "prod" ]]; then
      start_bg worker pnpm --filter @accessshield/api start:worker
    else
      start_bg worker pnpm --filter @accessshield/api dev:worker
    fi
  fi

  if [[ "$SKIP_MOBILE" -eq 0 ]]; then
    if [[ "$MODE" == "prod" ]]; then
      start_bg mobile pnpm --filter @accessshield/mobile-scanner start
    else
      start_bg mobile pnpm --filter @accessshield/mobile-scanner dev
    fi
  fi

  if [[ "$SKIP_AI" -eq 0 ]]; then
    if [[ ! -f "$ROOT/apps/ai-service/.env" ]]; then
      warn "apps/ai-service/.env missing — skipping AI (copy from .env.example)"
    else
      ensure_ai_venv
      chmod +x "$ROOT/apps/ai-service/scripts/start.sh" 2>/dev/null || true
      if [[ "$MODE" == "prod" ]]; then
        start_bg ai "$ROOT/apps/ai-service/scripts/start.sh"
      else
        # Prefer start.sh --reload so deploy-managed PID matches; falls back to package script
        start_bg ai "$ROOT/apps/ai-service/scripts/start.sh" --reload
      fi
    fi
  fi
}

smoke() {
  log "Smoke checks…"
  sleep 2
  if curl -sf "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
    ok "API /health OK"
  else
    warn "API /health not ready yet — see $LOG_DIR/api.log"
  fi
  if [[ "$SKIP_AI" -eq 0 ]] && [[ -f "$ROOT/apps/ai-service/.env" ]]; then
    if curl -sf "http://127.0.0.1:${AI_SERVICE_PORT:-8001}/health" >/dev/null 2>&1; then
      ok "AI /health OK"
      curl -s "http://127.0.0.1:${AI_SERVICE_PORT:-8001}/health" | head -c 400 || true
      echo
    else
      warn "AI /health not ready (warmup may still be running) — see $LOG_DIR/ai.log"
    fi
  fi
  if [[ "$SKIP_MOBILE" -eq 0 ]]; then
    local mobile_pid=""
    if [[ -f "$PID_DIR/mobile.pid" ]]; then
      mobile_pid="$(tr -d '[:space:]' <"$PID_DIR/mobile.pid")"
    fi
    if [[ -n "$mobile_pid" ]] && kill -0 "$mobile_pid" 2>/dev/null \
      && grep -qE 'Mobile scanner worker (started successfully|listening on queue)' "$LOG_DIR/mobile.log" 2>/dev/null; then
      ok "Mobile scanner worker OK"
    else
      warn "Mobile scanner not ready — see $LOG_DIR/mobile.log"
    fi
  fi
  log "Logs: $LOG_DIR"
  log "PIDs: $PID_DIR"
}

# ─── main ───────────────────────────────────────────────────────────────────

log "=== AccessShield deploy (mode=$MODE) ==="

[[ "$DO_PULL" -eq 1 ]] && run_pull
[[ "$DO_INFRA" -eq 1 ]] && run_infra
[[ "$DO_INSTALL" -eq 1 ]] && run_install
[[ "$DO_BUILD" -eq 1 ]] && run_build_packages
[[ "$DO_MIGRATE" -eq 1 ]] && run_migrate
[[ "$DO_BOOTSTRAP" -eq 1 ]] && run_bootstrap

if [[ "$DO_RESTART" -eq 1 ]]; then
  stop_apps
  start_apps
  smoke
fi

ok "Deploy finished"
log "Tip: routine updates → ./scripts/deploy.sh"
log "     migrate only   → ./scripts/deploy.sh --migrate-only"
log "     first box      → ./scripts/deploy.sh --bootstrap"
log "     local LLM      → ./scripts/deploy.sh --with-local-llm"
log "     skip mobile    → ./scripts/deploy.sh --skip-mobile"
log "     prod processes → ./scripts/deploy.sh --mode=prod"
