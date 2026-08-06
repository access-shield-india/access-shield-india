#!/usr/bin/env bash
# AccessShield — host tools setup (Ubuntu 22.04 bare metal)
#
# Installs / verifies scan-machine dependencies OUTSIDE Docker & DB:
#   - JDK 17, Android SDK, AVD, Appium + UiAutomator2
#   - Playwright Chromium (web scans)
#   - Local LLM (llama-cpp) + GGUF download/warmup from LOCAL_MODEL
#
# Usage:
#   ./scripts/setup-host-tools.sh              # all modules
#   ./scripts/setup-host-tools.sh android
#   ./scripts/setup-host-tools.sh browsers
#   ./scripts/setup-host-tools.sh llm
#   ./scripts/setup-host-tools.sh doctor       # verify + smoke
#   ANDROID_API_LEVEL=33 ./scripts/setup-host-tools.sh android
#
# Not merged into deploy.sh — run once (or when bumping versions.env).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST_TOOLS="$ROOT/scripts/host-tools"

# shellcheck source=/dev/null
source "$HOST_TOOLS/common.sh"

usage() {
  cat <<'EOF'
AccessShield host-tools setup (Ubuntu 22.04)

Usage: ./scripts/setup-host-tools.sh [command]

Commands:
  all        Install android + browsers + llm, then doctor (default)
  android    JDK, Android SDK, AVD, Appium
  browsers   Playwright Chromium for web scan worker
  llm        llama-cpp + download/warmup LOCAL_MODEL from env
  doctor     Verify installs + smoke tests (exit 1 on hard failure)

Env overrides:
  ANDROID_API_LEVEL   Default 34 (Android 14). Use 33 for Android 13.
  ANDROID_AVD_NAME    Default accessshield_api${ANDROID_API_LEVEL}
  LOCAL_MODEL         Prefer apps/ai-service/.env then root .env.local

Android note:
  Setup pins one system image. The mobile-scanner binds by adb udid and does
  not require Appium platformVersion to match a hardcoded 13.0.

EOF
}

cmd_android() {
  # shellcheck source=/dev/null
  source "$HOST_TOOLS/android.sh"
  setup_android
}

cmd_browsers() {
  # shellcheck source=/dev/null
  source "$HOST_TOOLS/browsers.sh"
  setup_browsers
}

cmd_llm() {
  # shellcheck source=/dev/null
  source "$HOST_TOOLS/llm.sh"
  setup_llm
}

cmd_doctor() {
  # shellcheck source=/dev/null
  source "$HOST_TOOLS/doctor.sh"
  run_doctor
}

cmd_all() {
  cmd_android
  cmd_browsers
  cmd_llm
  cmd_doctor
}

COMMAND="${1:-all}"
case "$COMMAND" in
  -h|--help|help) usage; exit 0 ;;
  all) cmd_all ;;
  android) cmd_android ;;
  browsers) cmd_browsers ;;
  llm) cmd_llm ;;
  doctor) cmd_doctor ;;
  *) die "Unknown command: $COMMAND (try --help)" ;;
esac
