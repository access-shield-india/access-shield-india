#!/usr/bin/env bash
# Verify host tools: Java, Android SDK/AVD/adb/KVM, Appium, Playwright, local LLM.
set -euo pipefail

HOST_TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$HOST_TOOLS_DIR/common.sh"

PASS=0
FAIL=0
WARN=0

pass() { ok "$1"; PASS=$((PASS + 1)); }
fail() { printf '%s✗%s %s\n' "$RED" "$NC" "$1"; FAIL=$((FAIL + 1)); }
soft() { warn "$1"; WARN=$((WARN + 1)); }

check_java() {
  if have_cmd java; then
    pass "java: $(java -version 2>&1 | head -n1)"
  else
    fail "java missing"
  fi
  if [[ -d "${JAVA_HOME:-$JAVA_HOME_HINT}" ]]; then
    pass "JAVA_HOME=${JAVA_HOME:-$JAVA_HOME_HINT}"
  else
    soft "JAVA_HOME not set / missing"
  fi
}

check_android() {
  export_android_env
  if [[ -x "${ANDROID_SDK_ROOT}/platform-tools/adb" ]]; then
    pass "adb: $("${ANDROID_SDK_ROOT}/platform-tools/adb" version | head -n1)"
  else
    fail "adb missing under $ANDROID_SDK_ROOT"
  fi
  if [[ -x "${ANDROID_SDK_ROOT}/emulator/emulator" ]]; then
    pass "emulator binary present"
  else
    fail "emulator binary missing"
  fi
  if [[ -e /dev/kvm ]]; then
    pass "KVM /dev/kvm present"
  else
    soft "KVM missing — enable VT-x in BIOS"
  fi
  if "${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/avdmanager" list avd 2>/dev/null | grep -q "Name: ${ANDROID_AVD_NAME}"; then
    pass "AVD $ANDROID_AVD_NAME exists"
  else
    fail "AVD $ANDROID_AVD_NAME not found"
  fi
  local serials
  serials="$("${ANDROID_SDK_ROOT}/platform-tools/adb" devices 2>/dev/null | awk '/\tdevice$/{print $1}')"
  if [[ -n "$serials" ]]; then
    local s ver
    s="$(printf '%s\n' "$serials" | head -n1)"
    ver="$("${ANDROID_SDK_ROOT}/platform-tools/adb" -s "$s" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')"
    pass "device online: $s (Android ${ver:-unknown})"
  else
    soft "no emulator/device online (start AVD before mobile scans)"
  fi
}

check_appium() {
  local bin="${APPIUM_BIN:-}"
  if [[ -z "$bin" ]]; then
    if [[ -x "$ROOT/apps/mobile-scanner/node_modules/.bin/appium" ]]; then
      bin="$ROOT/apps/mobile-scanner/node_modules/.bin/appium"
    elif [[ -x "$ROOT/node_modules/.bin/appium" ]]; then
      bin="$ROOT/node_modules/.bin/appium"
    elif have_cmd appium; then
      bin=appium
    fi
  fi
  if [[ -z "$bin" ]]; then
    fail "appium not found"
    return
  fi
  pass "appium: $("$bin" -v 2>/dev/null || echo present)"
  if curl -sf "http://${APPIUM_HOST}:${APPIUM_PORT}/status" >/dev/null 2>&1; then
    pass "Appium listening on ${APPIUM_HOST}:${APPIUM_PORT}"
  else
    soft "Appium not listening on :${APPIUM_PORT} (worker can auto-start it)"
  fi
}

check_browsers() {
  if ! have_cmd pnpm; then
    fail "pnpm missing (needed for Playwright)"
    return
  fi
  if (
    cd "$ROOT"
    pnpm --filter @accessshield/api exec playwright --version >/dev/null 2>&1
  ); then
    pass "Playwright CLI available"
  else
    fail "Playwright not installed for @accessshield/api"
    return
  fi
  # Launch smoke — headless chromium
  if (
    cd "$ROOT/apps/api"
    node --input-type=module -e '
      import { chromium } from "playwright";
      const b = await chromium.launch({ headless: true });
      const p = await b.newPage();
      await p.goto("about:blank");
      await b.close();
      console.log("ok");
    ' >/dev/null 2>&1
  ); then
    pass "Playwright Chromium launch smoke OK"
  else
    fail "Playwright Chromium failed to launch"
  fi
}

check_llm() {
  local venv="$ROOT/apps/ai-service/.venv"
  if [[ ! -f "$venv/bin/python" ]]; then
    fail "ai-service venv missing"
    return
  fi
  if "$venv/bin/python" -c 'import llama_cpp' 2>/dev/null; then
    pass "llama-cpp-python import OK"
  else
    fail "llama-cpp-python not installed in ai-service venv"
  fi
  local model
  model="$(resolve_local_model)"
  pass "LOCAL_MODEL=$model"
  if [[ -d "$HF_HOME" ]]; then
    pass "HF_HOME=$HF_HOME"
  else
    soft "HF_HOME $HF_HOME missing (model not downloaded yet?)"
  fi
}

check_env_local() {
  if [[ ! -f "$ENV_LOCAL" ]]; then
    fail ".env.local missing"
    return
  fi
  local key
  for key in ANDROID_HOME ANDROID_SDK_ROOT; do
    if grep -qE "^[[:space:]]*${key}=" "$ENV_LOCAL"; then
      pass ".env.local has $key"
    else
      soft ".env.local missing $key"
    fi
  done
}

run_doctor() {
  log "=== AccessShield host-tools doctor ==="
  check_java
  check_android
  check_appium
  check_browsers
  check_llm
  check_env_local
  log ""
  log "Result: ${PASS} passed, ${WARN} warnings, ${FAIL} failed"
  if [[ "$FAIL" -gt 0 ]]; then
    exit 1
  fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_doctor
fi
