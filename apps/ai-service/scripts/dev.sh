#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv"

find_python() {
  # Prefer stable versions with prebuilt wheels; avoid broken default python3 (often 3.14+)
  # Prefer 3.12/3.11 (pinned deps tested there); 3.13 needs pillow>=11 / asyncpg>=0.30
  for cmd in /opt/anaconda3/envs/py312/bin/python3.12 python3.12 python3.11 python3.13 python3; do
    if command -v "$cmd" >/dev/null 2>&1; then
      local version
      version="$("$cmd" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
      local major minor
      major="${version%%.*}"
      minor="${version#*.}"
      if (( major > 3 || (major == 3 && minor >= 11) )) && (( major < 3 || (major == 3 && minor <= 13) )); then
        echo "$cmd"
        return 0
      fi
    fi
  done
  echo "Python 3.11+ required. Install with: brew install python@3.12" >&2
  exit 1
}

PYTHON="$(find_python)"
echo "Using $("$PYTHON" --version) ($PYTHON)"

if [[ -d "$VENV" ]]; then
  venv_py="$("$VENV/bin/python" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "broken")"
  selected_py="$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
  if [[ "$venv_py" != "$selected_py" ]]; then
    echo "Recreating venv (was Python $venv_py, need $selected_py) ..."
    rm -rf "$VENV"
  fi
fi

if [[ ! -d "$VENV" ]]; then
  echo "Creating Python venv at apps/ai-service/.venv ..."
  "$PYTHON" -m venv "$VENV"
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"

if ! python -c "import uvicorn" >/dev/null 2>&1; then
  echo "Installing ai-service Python dependencies (first run may take a minute) ..."
  export CMAKE_ARGS="-DGGML_METAL=on -DLLAMA_CURL=off -DLLAMA_OPENSSL=off"
  pip install -q --upgrade pip
  pip install -q -e "$ROOT[dev,local]"
fi

cd "$ROOT"

# Load monorepo env (same source as API/web) so Redis + DATABASE_URL stay in sync
MONOREPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
if [[ -f "$MONOREPO_ROOT/.env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$MONOREPO_ROOT/.env.local"
  set +a
fi

# asyncpg driver required by SQLAlchemy async engine
if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" == postgresql://* ]]; then
  export DATABASE_URL="postgresql+asyncpg://${DATABASE_URL#postgresql://}"
fi

PORT="${AI_SERVICE_PORT:-8001}"
if lsof -ti ":$PORT" >/dev/null 2>&1; then
  echo "Port $PORT already in use. Run 'pnpm dev:stop' from the repo root, then try again." >&2
  exit 1
fi

exec uvicorn main:app --reload --host 0.0.0.0 --port "$PORT"
