#!/usr/bin/env bash
# Shared helpers for host-tools setup (Ubuntu 22.04).
set -euo pipefail

HOST_TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Preserve caller overrides before versions.env defaults
_ANDROID_API_LEVEL_OVERRIDE="${ANDROID_API_LEVEL:-}"
_ANDROID_AVD_NAME_OVERRIDE="${ANDROID_AVD_NAME:-}"
# shellcheck source=/dev/null
source "$HOST_TOOLS_DIR/versions.env"
if [[ -n "$_ANDROID_API_LEVEL_OVERRIDE" ]]; then
  ANDROID_API_LEVEL="$_ANDROID_API_LEVEL_OVERRIDE"
fi
if [[ -n "$_ANDROID_AVD_NAME_OVERRIDE" ]]; then
  ANDROID_AVD_NAME="$_ANDROID_AVD_NAME_OVERRIDE"
else
  ANDROID_AVD_NAME="accessshield_api${ANDROID_API_LEVEL}"
fi
unset _ANDROID_API_LEVEL_OVERRIDE _ANDROID_AVD_NAME_OVERRIDE

ROOT="$(cd "$HOST_TOOLS_DIR/../.." && pwd)"
ENV_LOCAL="$ROOT/.env.local"
AI_ENV="$ROOT/apps/ai-service/.env"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
NC=$'\033[0m'

log()  { printf '%s\n' "$*"; }
ok()   { printf '%s✓%s %s\n' "$GREEN" "$NC" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$NC" "$*"; }
die()  { printf '%s✗%s %s\n' "$RED" "$NC" "$*" >&2; exit 1; }

require_root_or_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    return 0
  fi
  command -v sudo >/dev/null 2>&1 || die "sudo required"
}

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

ensure_dir() {
  local dir="$1"
  local mode="${2:-755}"
  if [[ ! -d "$dir" ]]; then
    run_root mkdir -p "$dir"
  fi
  run_root chmod "$mode" "$dir"
  if [[ "$(id -u)" -ne 0 ]]; then
    run_root chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "$dir" 2>/dev/null || true
  fi
}

# Upsert KEY=VALUE in a dotenv file (creates file if missing).
upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp

  touch "$file" 2>/dev/null || {
    run_root touch "$file"
    run_root chown "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "$file"
  }

  tmp="$(mktemp)"
  if grep -qE "^[[:space:]]*${key}=" "$file" 2>/dev/null; then
    # shellcheck disable=SC2001
    sed -E "s|^[[:space:]]*${key}=.*|${key}=${value}|" "$file" >"$tmp"
  else
    cat "$file" >"$tmp"
    printf '\n%s=%s\n' "$key" "$value" >>"$tmp"
  fi
  cat "$tmp" >"$file"
  rm -f "$tmp"
}

read_env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1
  local line
  line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n1 || true)"
  [[ -n "$line" ]] || return 1
  printf '%s' "${line#*=}"
}

resolve_local_model() {
  local model=""
  model="$(read_env_value "$AI_ENV" LOCAL_MODEL 2>/dev/null || true)"
  if [[ -z "$model" ]]; then
    model="$(read_env_value "$ENV_LOCAL" LOCAL_MODEL 2>/dev/null || true)"
  fi
  if [[ -z "$model" ]]; then
    model="$DEFAULT_LOCAL_MODEL"
  fi
  # strip quotes
  model="${model%\"}"
  model="${model#\"}"
  model="${model%\'}"
  model="${model#\'}"
  printf '%s' "$model"
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

export_android_env() {
  export ANDROID_HOME="${ANDROID_SDK_ROOT}"
  export ANDROID_SDK_ROOT
  export ANDROID_AVD_HOME
  export PATH="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/emulator:${PATH}"
  if [[ -d "${JAVA_HOME_HINT}" ]]; then
    export JAVA_HOME="${JAVA_HOME_HINT}"
    export PATH="${JAVA_HOME}/bin:${PATH}"
  fi
}
