#!/usr/bin/env bash
# Local LLM: Python venv extras + download GGUF from LOCAL_MODEL in env.
set -euo pipefail

HOST_TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$HOST_TOOLS_DIR/common.sh"

find_python() {
  local cmd
  for cmd in python3.12 python3.11 python3.13 python3; do
    if command -v "$cmd" >/dev/null 2>&1; then
      local ver major minor
      ver="$("$cmd" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
      major="${ver%%.*}"
      minor="${ver#*.}"
      if (( major == 3 && minor >= 11 && minor <= 13 )); then
        printf '%s' "$cmd"
        return 0
      fi
    fi
  done
  return 1
}

setup_llm() {
  require_root_or_sudo
  local py
  py="$(find_python)" || die "Python 3.11–3.13 required for ai-service"

  run_root apt-get update -qq
  # Package names vary; try versioned first
  if ! run_root DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    build-essential cmake pkg-config "${py}" "${py}-venv" "${py}-dev" 2>/dev/null; then
    run_root DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
      build-essential cmake pkg-config python3 python3-venv python3-dev
    py=python3
  fi

  local ai_root="$ROOT/apps/ai-service"
  local venv="$ai_root/.venv"
  [[ -f "$ai_root/.env" ]] || warn "apps/ai-service/.env missing — copy from .env.example"

  if [[ ! -d "$venv" ]]; then
    log "Creating ai-service venv ($py)…"
    "$py" -m venv "$venv"
  fi

  # shellcheck source=/dev/null
  source "$venv/bin/activate"
  pip install -q --upgrade pip
  log "Installing ai-service deps + [local] (llama-cpp-python)…"
  pip install -q -e "$ai_root[dev,local]"

  ensure_dir "$HF_HOME"
  export HF_HOME
  export HUGGINGFACE_HUB_CACHE="${HF_HOME}/hub"

  local model
  model="$(resolve_local_model)"
  log "Downloading GGUF for LOCAL_MODEL=$model (HF cache: $HF_HOME)…"

  AS_LOCAL_MODEL="$model" python - <<'PY'
from huggingface_hub import hf_hub_download, list_repo_files
import os

repo = os.environ["AS_LOCAL_MODEL"]
files = [f for f in list_repo_files(repo) if f.lower().endswith("q4_k_m.gguf")]
if not files:
    files = [f for f in list_repo_files(repo) if f.endswith(".gguf")]
if not files:
    raise SystemExit(f"No GGUF files found in {repo}")
chosen = files[0]
print(f"Fetching {repo} / {chosen}")
path = hf_hub_download(repo_id=repo, filename=chosen)
print(f"Cached at {path}")
PY

  [[ -f "$AI_ENV" ]] || cp "$ai_root/.env.example" "$AI_ENV" 2>/dev/null || touch "$AI_ENV"
  upsert_env "$AI_ENV" LOCAL_MODEL "$model"
  upsert_env "$AI_ENV" LOCAL_LLM_WARMUP "true"
  upsert_env "$AI_ENV" HF_HOME "$HF_HOME"
  if [[ -f "$ENV_LOCAL" ]]; then
    upsert_env "$ENV_LOCAL" LOCAL_MODEL "$model"
    upsert_env "$ENV_LOCAL" HF_HOME "$HF_HOME"
  else
    touch "$ENV_LOCAL"
    upsert_env "$ENV_LOCAL" LOCAL_MODEL "$model"
    upsert_env "$ENV_LOCAL" HF_HOME "$HF_HOME"
  fi

  log "Warmup probe (load model + tiny completion)…"
  (
    cd "$ai_root"
    HF_HOME="$HF_HOME" HUGGINGFACE_HUB_CACHE="${HF_HOME}/hub" python - <<PY
import asyncio
from utils.local_client import LocalClient

async def main() -> None:
    client = LocalClient("${model}")
    await client.warmup(run_probe=True)
    print("Local LLM warmup OK: ${model}")

asyncio.run(main())
PY
  )

  deactivate 2>/dev/null || true
  ok "Local LLM installed + model cached + warmup OK ($model)"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  setup_llm
fi
